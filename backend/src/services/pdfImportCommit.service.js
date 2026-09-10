import { prisma } from '../config/prisma.js';
import { examDeepInclude } from '../prisma/selects.js';
import { ApiError } from '../utils/apiError.js';

const QUESTION_TYPES = new Set(['single_choice', 'multi_choice', 'text_input', 'passage_question', 'math_question']);

function clean(value) {
  return String(value || '').trim();
}

function sectionTypeFor(question) {
  const classification = `${question.sectionType || ''} ${question.sectionTitle || ''}`.toLowerCase();
  return classification.includes('math') ? 'math' : 'reading_writing';
}

function sectionLabel(type) {
  return type === 'math' ? 'Math' : 'Reading and Writing';
}

function acceptedAnswers(question) {
  const answer = question.correctAnswer;
  if (Array.isArray(answer)) return answer.map(clean).filter(Boolean);
  return clean(answer) ? [clean(answer)] : [];
}

function normalizedOptions(question) {
  const usedLabels = new Set();
  const nextAvailableLabel = () => {
    for (let code = 65; code <= 72; code += 1) {
      const candidate = String.fromCharCode(code);
      if (!usedLabels.has(candidate)) return candidate;
    }
    return null;
  };

  return (question.options || []).reduce((rows, option) => {
    const text = clean(option.text);
    if (!text) return rows;

    const requestedLabel = clean(option.label).toUpperCase();
    const label = /^[A-H]$/.test(requestedLabel) && !usedLabels.has(requestedLabel)
      ? requestedLabel
      : nextAvailableLabel();
    if (!label) return rows;

    usedLabels.add(label);
    rows.push({ label, text, imageUrl: null, order: rows.length + 1 });
    return rows;
  }, []);
}

export function buildPdfImportPlan({ setup, draft }) {
  const selectedQuestions = (draft.questions || []).filter((question) => question.status !== 'INVALID');
  if (!selectedQuestions.length) {
    throw new ApiError(400, 'Select at least one valid question to import.');
  }

  const passages = new Map((draft.passages || []).map((passage) => [passage.temporaryId, passage]));
  const groups = new Map();
  const skipped = [];

  for (const question of selectedQuestions) {
    const type = sectionTypeFor(question);
    const options = normalizedOptions(question);
    const answers = acceptedAnswers(question);
    const usesOptions = options.length >= 2;
    const questionType = usesOptions
      ? (question.type === 'multi_choice' ? 'multi_choice' : question.type === 'passage_question' ? 'passage_question' : 'single_choice')
      : 'text_input';

    if (!clean(question.questionText)) {
      skipped.push({ temporaryId: question.temporaryId, reason: 'Question text is missing.' });
      continue;
    }
    if (!QUESTION_TYPES.has(question.type) && !usesOptions) {
      skipped.push({ temporaryId: question.temporaryId, reason: 'Question type is not supported.' });
      continue;
    }
    if (!usesOptions && !answers.length) {
      skipped.push({ temporaryId: question.temporaryId, reason: 'Student-produced response has no accepted answer.' });
      continue;
    }

    const moduleTitle = clean(question.moduleTitle) || `${sectionLabel(type)} Module 1`;
    const groupKey = `${type}:${moduleTitle.toLowerCase()}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { type, title: moduleTitle, questions: [] });
    }

    const correctLabels = answers.map((answer) => answer.toUpperCase());
    groups.get(groupKey).questions.push({
      temporaryId: question.temporaryId,
      passageTempId: question.passageTempId || null,
      type: questionType,
      skill: clean(question.skill) || 'Needs review',
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(question.difficulty) ? question.difficulty : 'MEDIUM',
      questionText: clean(question.questionText),
      instructions: clean(question.instructions) || null,
      formulaText: type === 'math' ? clean(question.formulaText) || null : null,
      calculatorAllowed: type === 'math' && question.calculatorAllowed !== false,
      acceptedAnswers: usesOptions ? undefined : answers,
      correctAnswer: usesOptions ? { value: correctLabels[0] || null } : { acceptedAnswers: answers },
      explanation: clean(question.explanation) || 'Imported from PDF. Review and add a worked explanation.',
      options: usesOptions
        ? options.map((option) => ({
            ...option,
            isCorrect: correctLabels.includes(option.label)
          }))
        : []
    });
  }

  const modules = [...groups.values()].filter((group) => group.questions.length);
  if (!modules.length) {
    throw new ApiError(400, 'None of the selected questions can be imported safely.');
  }

  const referencedPassageIds = new Set(
    modules.flatMap((module) => module.questions.map((question) => question.passageTempId).filter(Boolean))
  );
  const passageRows = [...referencedPassageIds]
    .map((temporaryId) => passages.get(temporaryId))
    .filter((passage) => clean(passage?.content))
    .map((passage) => ({
      temporaryId: passage.temporaryId,
      title: clean(passage.title) || `Passage from page ${passage.sourcePage || ''}`.trim(),
      content: clean(passage.content),
      category: 'reading'
    }));

  return {
    exam: {
      title: clean(setup.title),
      description: clean(setup.description),
      type: setup.type,
      accessType: setup.accessType,
      contentMode: 'REAL_EXAM',
      source: setup.source,
      scoringModel: 'SAT_ESTIMATE_V1',
      competitionKind: 'NONE',
      referenceText: null,
      totalDuration: setup.totalDuration,
      isPublished: false
    },
    passages: passageRows,
    modules,
    skipped
  };
}

export async function commitPdfImport(payload, db = prisma) {
  const plan = buildPdfImportPlan(payload);
  try {
    return await db.$transaction(async (transaction) => {
      const exam = await transaction.exam.create({ data: plan.exam });
      const passageIdMap = new Map();

      for (const passage of plan.passages) {
        const created = await transaction.passage.create({
          data: { title: passage.title, content: passage.content, category: passage.category }
        });
        passageIdMap.set(passage.temporaryId, created.id);
      }

      let importedQuestions = 0;
      for (let moduleIndex = 0; moduleIndex < plan.modules.length; moduleIndex += 1) {
        const module = plan.modules[moduleIndex];
        const sameTypeIndex = plan.modules.slice(0, moduleIndex).filter((item) => item.type === module.type).length;
        const section = await transaction.section.create({
          data: {
            examId: exam.id,
            title: module.title,
            type: module.type,
            duration: module.type === 'math' ? 35 : 32,
            order: moduleIndex + 1,
            adaptiveRole: sameTypeIndex === 0 ? 'MODULE_1' : 'STANDARD',
            routingThreshold: 60
          }
        });

        for (let questionIndex = 0; questionIndex < module.questions.length; questionIndex += 1) {
          const question = module.questions[questionIndex];
          await transaction.question.create({
            data: {
              sectionId: section.id,
              passageId: passageIdMap.get(question.passageTempId) || null,
              type: question.type,
              skill: question.skill,
              difficulty: question.difficulty,
              questionText: question.questionText,
              instructions: question.instructions,
              formulaText: question.formulaText,
              calculatorAllowed: question.calculatorAllowed,
              acceptedAnswers: question.acceptedAnswers,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              order: questionIndex + 1,
              options: question.options.length ? { create: question.options } : undefined
            }
          });
          importedQuestions += 1;
        }
      }

      const savedExam = await transaction.exam.findUnique({
        where: { id: exam.id },
        include: examDeepInclude
      });
      return {
        exam: savedExam,
        importedQuestions,
        importedPassages: passageIdMap.size,
        skipped: plan.skipped
      };
    }, {
      maxWait: 15000,
      timeout: 180000
    });
  } catch (error) {
    if (error?.code === 'P2028') {
      throw new ApiError(503, 'The PDF import took too long. Please try again; no partial exam was saved.');
    }
    if (error?.code === 'P2002') {
      throw new ApiError(400, 'The PDF contains duplicate answer labels. Review the detected questions and try again.');
    }
    throw error;
  }
}
