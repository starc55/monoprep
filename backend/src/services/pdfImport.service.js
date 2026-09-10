import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { createStructuredOpenAIResponse } from './openai.service.js';
import { extractPdfPages } from './pdfExtraction.service.js';
import { buildPdfVisionChunks } from './pdfVision.service.js';

const QUESTION_TYPES = new Set([
  'single_choice',
  'multi_choice',
  'text_input',
  'passage_question',
  'audio_question',
  'math_question'
]);
const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);
const MAX_CHUNK_CHARACTERS = 16_000;
const MAX_TOTAL_CHARACTERS = 240_000;
const PDF_VISION_TIMEOUT_MS = 180_000;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const nullableBoolean = { anyOf: [{ type: 'boolean' }, { type: 'null' }] };

const parsedChunkValidator = z.object({
  examTitle: z.string().nullable(),
  passages: z.array(z.object({
    temporaryKey: z.string(),
    title: z.string().nullable(),
    content: z.string(),
    sourcePage: z.number().int()
  }).strict()),
  questions: z.array(z.object({
    questionNumber: z.string().nullable(),
    questionText: z.string().nullable(),
    type: z.string().nullable(),
    skill: z.string().nullable(),
    difficulty: z.string().nullable(),
    sectionTitle: z.string().nullable(),
    sectionType: z.string().nullable(),
    moduleTitle: z.string().nullable(),
    passageKey: z.string().nullable(),
    options: z.array(z.object({
      label: z.string().nullable(),
      text: z.string().nullable()
    }).strict()),
    correctAnswer: z.union([z.string(), z.array(z.string()), z.null()]),
    explanation: z.string().nullable(),
    instructions: z.string().nullable(),
    formulaText: z.string().nullable(),
    calculatorAllowed: z.boolean().nullable(),
    sourcePage: z.number().int(),
    warnings: z.array(z.string()),
    confidence: z.number().nullable()
  }).strict()),
  warnings: z.array(z.string())
}).strict();

export const pdfImportChunkSchema = {
  type: 'object',
  properties: {
    examTitle: nullableString,
    passages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          temporaryKey: { type: 'string' },
          title: nullableString,
          content: { type: 'string' },
          sourcePage: { type: 'integer' }
        },
        required: ['temporaryKey', 'title', 'content', 'sourcePage'],
        additionalProperties: false
      }
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionNumber: nullableString,
          questionText: nullableString,
          type: { anyOf: [{ type: 'string', enum: [...QUESTION_TYPES] }, { type: 'null' }] },
          skill: nullableString,
          difficulty: { anyOf: [{ type: 'string', enum: [...DIFFICULTIES] }, { type: 'null' }] },
          sectionTitle: nullableString,
          sectionType: nullableString,
          moduleTitle: nullableString,
          passageKey: nullableString,
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: nullableString,
                text: nullableString
              },
              required: ['label', 'text'],
              additionalProperties: false
            }
          },
          correctAnswer: {
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
              { type: 'null' }
            ]
          },
          explanation: nullableString,
          instructions: nullableString,
          formulaText: nullableString,
          calculatorAllowed: nullableBoolean,
          sourcePage: { type: 'integer' },
          warnings: { type: 'array', items: { type: 'string' } },
          confidence: nullableNumber
        },
        required: [
          'questionNumber', 'questionText', 'type', 'skill', 'difficulty',
          'sectionTitle', 'sectionType', 'moduleTitle', 'passageKey', 'options',
          'correctAnswer', 'explanation', 'instructions', 'formulaText',
          'calculatorAllowed', 'sourcePage', 'warnings', 'confidence'
        ],
        additionalProperties: false
      }
    },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['examTitle', 'passages', 'questions', 'warnings'],
  additionalProperties: false
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function splitLongPage(page) {
  if (page.text.length <= MAX_CHUNK_CHARACTERS) return [page];
  const parts = [];
  for (let offset = 0; offset < page.text.length; offset += MAX_CHUNK_CHARACTERS) {
    parts.push({ ...page, text: page.text.slice(offset, offset + MAX_CHUNK_CHARACTERS) });
  }
  return parts;
}

export function buildPdfTextChunks(pages) {
  const chunks = [];
  let current = [];
  let currentLength = 0;
  let totalAccepted = 0;

  for (const originalPage of pages) {
    for (const page of splitLongPage(originalPage)) {
      if (!page.text.trim() || totalAccepted >= MAX_TOTAL_CHARACTERS) continue;
      const remaining = MAX_TOTAL_CHARACTERS - totalAccepted;
      const acceptedText = page.text.slice(0, remaining);
      const entry = { pageNumber: page.pageNumber, text: acceptedText };
      const entryLength = acceptedText.length + 24;

      if (current.length && currentLength + entryLength > MAX_CHUNK_CHARACTERS) {
        chunks.push(current);
        current = [];
        currentLength = 0;
      }
      current.push(entry);
      currentLength += entryLength;
      totalAccepted += acceptedText.length;
    }
  }

  if (current.length) chunks.push(current);
  return chunks;
}

function chunkPrompt(chunk, index, total) {
  const pageText = chunk
    .map((page) => `--- SOURCE PAGE ${page.pageNumber} ---\n${page.text}`)
    .join('\n\n');
  return [
    `Parse chunk ${index + 1} of ${total} from a MonoPrep exam PDF.`,
    'Extract only information explicitly supported by the supplied text.',
    'Never invent a correct answer or explanation. Use null when either is absent.',
    'Preserve shared passages once and reference them through passageKey.',
    'Map question type and difficulty to the allowed enum values when clear; otherwise use null.',
    'sourcePage must match the SOURCE PAGE marker.',
    pageText
  ].join('\n\n');
}

export async function parsePdfChunks(chunks, { client, onRequestStart, onUsage } = {}) {
  const parsedChunks = [];
  const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (let index = 0; index < chunks.length; index += 1) {
    onRequestStart?.();
    const result = await createStructuredOpenAIResponse({
      operation: 'pdf_import_preview',
      schemaName: 'monoprep_pdf_import_chunk',
      schema: pdfImportChunkSchema,
      instructions: 'You extract exam questions conservatively. Do not infer missing answers or explanations.',
      prompt: chunkPrompt(chunks[index], index, chunks.length),
      maxOutputTokens: 8_000,
      client
    });
    const parsed = parsedChunkValidator.safeParse(result.data);
    if (!parsed.success) {
      throw new ApiError(502, 'AI service returned an invalid import preview. Please try again.');
    }
    parsedChunks.push(parsed.data);
    usage.inputTokens += result.usage?.inputTokens || 0;
    usage.outputTokens += result.usage?.outputTokens || 0;
    usage.totalTokens += result.usage?.totalTokens || 0;
    onUsage?.(result.usage);
  }

  return { parsedChunks, usage, requestCount: chunks.length };
}

function visualChunkPrompt(chunk, index, total) {
  const pageMap = chunk.pageNumbers
    .map((pageNumber, pageIndex) => `PDF page ${pageIndex + 1} = original source page ${pageNumber}`)
    .join(', ');
  return [
    `Visually parse scanned exam PDF chunk ${index + 1} of ${total}.`,
    `Page mapping: ${pageMap}.`,
    'Read the page images, including passages, tables, formulas, diagrams, question text, and answer choices.',
    'Use original source page numbers from the mapping for every passage and question.',
    'Preserve shared passages once and reference them through passageKey.',
    'Determine the correct answer by solving the question when it is not visibly marked; use null only when it cannot be determined reliably.',
    'Map question type and difficulty to the allowed enum values when clear; otherwise use null.',
    'Do not create questions from headers, directions, answer keys, or page furniture.'
  ].join('\n');
}

function remapVisualPage(sourcePage, pageNumbers) {
  const numericPage = Number(sourcePage);
  if (pageNumbers.includes(numericPage)) return numericPage;
  if (Number.isInteger(numericPage) && numericPage >= 1 && numericPage <= pageNumbers.length) {
    return pageNumbers[numericPage - 1];
  }
  return numericPage;
}

export async function parsePdfVisionChunks(chunks, { client, onRequestStart, onUsage } = {}) {
  const parsedChunks = [];
  const failedPageNumbers = [];
  const warnings = [];
  const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    try {
      onRequestStart?.();
      const result = await createStructuredOpenAIResponse({
        operation: 'pdf_import_vision_preview',
        schemaName: 'monoprep_pdf_import_vision_chunk',
        schema: pdfImportChunkSchema,
        instructions: 'You accurately reconstruct SAT-style exam content from scanned PDF pages and return only schema-compliant JSON.',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: visualChunkPrompt(chunk, index, chunks.length) },
            {
              type: 'input_file',
              filename: `monoprep-pages-${chunk.pageNumbers[0]}-${chunk.pageNumbers.at(-1)}.pdf`,
              file_data: chunk.fileData
            }
          ]
        }],
        maxOutputTokens: 16_000,
        timeoutMs: PDF_VISION_TIMEOUT_MS,
        client
      });
      const parsed = parsedChunkValidator.safeParse(result.data);
      if (!parsed.success) throw new ApiError(502, 'AI returned an invalid visual import preview.');

      parsedChunks.push({
        ...parsed.data,
        passages: parsed.data.passages.map((passage) => ({
          ...passage,
          sourcePage: remapVisualPage(passage.sourcePage, chunk.pageNumbers)
        })),
        questions: parsed.data.questions.map((question) => ({
          ...question,
          sourcePage: remapVisualPage(question.sourcePage, chunk.pageNumbers)
        }))
      });
      usage.inputTokens += result.usage?.inputTokens || 0;
      usage.outputTokens += result.usage?.outputTokens || 0;
      usage.totalTokens += result.usage?.totalTokens || 0;
      onUsage?.(result.usage);
    } catch (error) {
      failedPageNumbers.push(...chunk.pageNumbers);
      warnings.push(`Visual reading failed for pages ${chunk.pageNumbers[0]}-${chunk.pageNumbers.at(-1)}. ${error.message}`);
    }
  }

  return { parsedChunks, failedPageNumbers, warnings, usage, requestCount: chunks.length };
}

function sanitizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => ({
    label: String(option?.label || '').trim().toUpperCase(),
    text: option?.text == null ? null : String(option.text).trim()
  }));
}

function answerLabels(answer) {
  if (Array.isArray(answer)) return answer.map((value) => String(value).trim().toUpperCase());
  if (answer == null || answer === '') return [];
  return [String(answer).trim().toUpperCase()];
}

export function validateDraftQuestions(questions, { pageCount, passageIds = new Set() }) {
  const duplicateGroups = new Map();

  questions.forEach((candidate, index) => {
    const normalized = normalizeText(candidate?.questionText);
    if (!normalized) return;
    const group = duplicateGroups.get(normalized) || [];
    group.push(`draft-question-${index + 1}`);
    duplicateGroups.set(normalized, group);
  });

  return questions.map((candidate, index) => {
    const warnings = Array.isArray(candidate?.warnings)
      ? candidate.warnings.filter(Boolean).map(String)
      : [];
    const questionText = candidate?.questionText == null ? '' : String(candidate.questionText).trim();
    const type = QUESTION_TYPES.has(candidate?.type) ? candidate.type : null;
    const difficulty = DIFFICULTIES.has(candidate?.difficulty) ? candidate.difficulty : null;
    const options = sanitizeOptions(candidate?.options);
    const labels = options.map((option) => option.label).filter(Boolean);
    const uniqueLabels = new Set(labels);
    const answers = answerLabels(candidate?.correctAnswer);
    const sourcePage = Number(candidate?.sourcePage);
    let status = 'READY';

    const invalidate = (warning) => {
      warnings.push(warning);
      status = 'INVALID';
    };
    const review = (warning) => {
      warnings.push(warning);
      if (status === 'READY') status = 'NEEDS_REVIEW';
    };

    if (!questionText) invalidate('Question text is missing.');
    if (!type) invalidate('Question type is missing or invalid.');
    if (!Number.isInteger(sourcePage) || sourcePage < 1 || sourcePage > pageCount) {
      invalidate('Source page is outside the uploaded PDF.');
    }
    if (!difficulty) review('Difficulty needs review.');
    if (!String(candidate?.skill || '').trim()) review('Skill classification needs review.');
    if (!String(candidate?.sectionTitle || '').trim()) review('Section classification needs review.');

    const multipleChoice = ['single_choice', 'multi_choice', 'passage_question'].includes(type) || options.length > 0;
    if (multipleChoice && options.length < 2) invalidate('Multiple-choice question needs at least two options.');
    if (options.some((option) => !option.label || !option.text)) review('One or more options are incomplete.');
    if (labels.length !== uniqueLabels.size) review('Option labels must be unique.');
    if (!answers.length) {
      review('Correct answer is missing.');
    } else if (multipleChoice && answers.some((answer) => !uniqueLabels.has(answer))) {
      review('Correct answer does not match an available option.');
    }

    if (candidate?.passageTempId && !passageIds.has(candidate.passageTempId)) {
      review('Passage association needs review.');
    }
    if (type === 'passage_question' && !candidate?.passageTempId) {
      review('Passage association is missing.');
    }

    const normalized = normalizeText(questionText);
    const duplicateIds = duplicateGroups.get(normalized) || [];
    if (duplicateIds.length > 1) {
      const otherId = duplicateIds.find((id) => id !== `draft-question-${index + 1}`);
      review(`Possible duplicate of ${otherId} within this PDF.`);
    }

    const confidenceValue = Number(candidate?.confidence);
    const confidence = Number.isFinite(confidenceValue)
      ? Math.max(0, Math.min(1, confidenceValue))
      : null;

    return {
      temporaryId: `draft-question-${index + 1}`,
      questionNumber: candidate?.questionNumber == null ? null : String(candidate.questionNumber),
      questionText,
      type,
      skill: candidate?.skill == null ? null : String(candidate.skill).trim() || null,
      difficulty,
      options,
      correctAnswer: multipleChoice
        ? (Array.isArray(candidate?.correctAnswer) ? answers : answers[0] || null)
        : candidate?.correctAnswer ?? null,
      explanation: candidate?.explanation == null ? null : String(candidate.explanation).trim() || null,
      instructions: candidate?.instructions == null ? null : String(candidate.instructions).trim() || null,
      formulaText: candidate?.formulaText == null ? null : String(candidate.formulaText).trim() || null,
      calculatorAllowed: typeof candidate?.calculatorAllowed === 'boolean' ? candidate.calculatorAllowed : null,
      passageTempId: candidate?.passageTempId || null,
      sourcePage: Number.isInteger(sourcePage) ? sourcePage : null,
      status,
      warnings: [...new Set(warnings)],
      confidence,
      sectionTitle: candidate?.sectionTitle == null ? null : String(candidate.sectionTitle).trim() || null,
      sectionType: candidate?.sectionType == null ? null : String(candidate.sectionType).trim() || null,
      moduleTitle: candidate?.moduleTitle == null ? null : String(candidate.moduleTitle).trim() || null
    };
  });
}

function mergeParsedChunks(parsedChunks) {
  const passages = [];
  const passageBySignature = new Map();
  const passageKeyMap = new Map();
  const questions = [];
  const warnings = [];
  let title = null;

  parsedChunks.forEach((chunk, chunkIndex) => {
    title ||= chunk.examTitle?.trim() || null;
    warnings.push(...(chunk.warnings || []));

    for (const passage of chunk.passages || []) {
      const signature = normalizeText(`${passage.title || ''} ${passage.content || ''}`);
      if (!signature) {
        warnings.push(`An empty passage from chunk ${chunkIndex + 1} was ignored.`);
        continue;
      }
      let saved = passageBySignature.get(signature);
      if (!saved) {
        const sourcePage = Number(passage.sourcePage);
        saved = {
          temporaryId: `draft-passage-${passages.length + 1}`,
          title: passage.title?.trim() || null,
          content: String(passage.content || '').trim(),
          sourcePage: Number.isInteger(sourcePage) ? sourcePage : null
        };
        passages.push(saved);
        passageBySignature.set(signature, saved);
      }
      passageKeyMap.set(`${chunkIndex}:${passage.temporaryKey}`, saved.temporaryId);
    }

    for (const question of chunk.questions || []) {
      questions.push({
        ...question,
        passageTempId: question.passageKey
          ? passageKeyMap.get(`${chunkIndex}:${question.passageKey}`) || `unresolved:${question.passageKey}`
          : null
      });
    }
  });

  return { title, passages, questions, warnings };
}

function buildExamSections(questions) {
  const sections = new Map();
  questions.forEach((question) => {
    const title = question.sectionTitle || 'Unclassified section';
    const sectionKey = normalizeText(title);
    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, {
        temporaryId: `draft-section-${sections.size + 1}`,
        title,
        type: question.sectionType,
        modules: []
      });
    }
    const section = sections.get(sectionKey);
    const moduleTitle = question.moduleTitle || 'Unassigned module';
    let module = section.modules.find((item) => item.title === moduleTitle);
    if (!module) {
      module = {
        temporaryId: `draft-module-${section.modules.length + 1}-${section.temporaryId}`,
        title: moduleTitle,
        questionTemporaryIds: []
      };
      section.modules.push(module);
    }
    module.questionTemporaryIds.push(question.temporaryId);
  });
  return [...sections.values()];
}

export async function createPdfImportPreview({
  buffer,
  fileName,
  requestId,
  client,
  extract = extractPdfPages,
  buildVisionChunks = buildPdfVisionChunks
}) {
  const startedAt = performance.now();
  let extraction = null;
  let openAiRequestCount = 0;
  let tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  try {
    extraction = await extract(buffer);
    const textChunks = buildPdfTextChunks(extraction.pages.filter((page) => !page.ocrNeeded));
    const textParseResult = textChunks.length
      ? await parsePdfChunks(textChunks, {
          client,
          onRequestStart() {
            openAiRequestCount += 1;
          }
        })
      : {
          parsedChunks: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          requestCount: 0
        };
    tokenUsage = textParseResult.usage;

    const visionChunks = await buildVisionChunks(buffer, extraction.ocrNeededPages);
    const visionParseResult = visionChunks.length
      ? await parsePdfVisionChunks(visionChunks, {
          client,
          onRequestStart() {
            openAiRequestCount += 1;
          }
        })
      : { parsedChunks: [], failedPageNumbers: [], warnings: [], usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    tokenUsage = {
      inputTokens: (textParseResult.usage?.inputTokens || 0) + (visionParseResult.usage?.inputTokens || 0),
      outputTokens: (textParseResult.usage?.outputTokens || 0) + (visionParseResult.usage?.outputTokens || 0),
      totalTokens: (textParseResult.usage?.totalTokens || 0) + (visionParseResult.usage?.totalTokens || 0)
    };

    const merged = mergeParsedChunks([...textParseResult.parsedChunks, ...visionParseResult.parsedChunks]);
    const passageIds = new Set(merged.passages.map((passage) => passage.temporaryId));
    const questions = validateDraftQuestions(merged.questions, {
      pageCount: extraction.pageCount,
      passageIds
    });
    const count = (status) => questions.filter((question) => question.status === status).length;

    return {
      fileName,
      pageCount: extraction.pageCount,
      totalDetected: questions.length,
      ready: count('READY'),
      needsReview: count('NEEDS_REVIEW'),
      invalid: count('INVALID'),
      ocrNeededPages: visionParseResult.failedPageNumbers,
      visionProcessedPages: extraction.ocrNeededPages.filter(
        (pageNumber) => !visionParseResult.failedPageNumbers.includes(pageNumber)
      ),
      warnings: [
        ...merged.warnings,
        ...visionParseResult.warnings,
        ...(extraction.extractedCharacterCount > MAX_TOTAL_CHARACTERS
          ? [`Only the first ${MAX_TOTAL_CHARACTERS} extracted characters were parsed.`]
          : [])
      ],
      examDraft: {
        title: merged.title || fileName.replace(/\.pdf$/i, ''),
        sections: buildExamSections(questions),
        passages: merged.passages
      },
      questions
    };
  } finally {
    console.info('[pdf-import] preview', {
      requestId,
      pageCount: extraction?.pageCount || 0,
      extractedCharacterCount: extraction?.extractedCharacterCount || 0,
      openAiRequestCount,
      tokenUsage,
      durationMs: Math.round(performance.now() - startedAt)
    });
  }
}
