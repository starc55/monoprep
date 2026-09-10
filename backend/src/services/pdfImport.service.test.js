import assert from 'node:assert/strict';
import test from 'node:test';
import { requireAuth, requireExamManager } from '../middleware/auth.middleware.js';
import {
  PDF_IMPORT_MAX_BYTES,
  validatePdfUploadFile
} from '../middleware/pdfImport.middleware.js';
import { extractPdfPages } from './pdfExtraction.service.js';
import {
  createPdfImportPreview,
  parsePdfChunks,
  validateDraftQuestions
} from './pdfImport.service.js';

function createTextPdf(text) {
  const escapedText = text.replace(/([\\()])/g, '\\$1');
  const stream = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
}

function uploadFile(buffer, overrides = {}) {
  return {
    buffer,
    size: buffer.length,
    mimetype: 'application/pdf',
    originalname: 'SAT Practice Test.pdf',
    ...overrides
  };
}

function validQuestion(overrides = {}) {
  return {
    questionNumber: '1',
    questionText: 'What is 2 + 2?',
    type: 'single_choice',
    skill: 'Linear equations',
    difficulty: 'EASY',
    sectionTitle: 'Math',
    sectionType: 'math',
    moduleTitle: 'Module 1',
    passageKey: null,
    options: [
      { label: 'A', text: '3' },
      { label: 'B', text: '4' }
    ],
    correctAnswer: 'b',
    explanation: null,
    instructions: null,
    formulaText: null,
    calculatorAllowed: true,
    sourcePage: 1,
    warnings: [],
    confidence: 0.96,
    ...overrides
  };
}

function middlewareResult(middleware, req) {
  let statusCode = 200;
  let body = null;
  let nextCalled = false;
  const res = {
    status(value) {
      statusCode = value;
      return this;
    },
    json(value) {
      body = value;
      return this;
    }
  };
  const result = middleware(req, res, () => {
    nextCalled = true;
  });
  return Promise.resolve(result).then(() => ({ statusCode, body, nextCalled }));
}

test('accepts a valid PDF and sanitizes its display filename', async () => {
  const pdf = createTextPdf('Question 1 asks which answer is supported by the passage.');
  const name = await validatePdfUploadFile(uploadFile(pdf, {
    originalname: '../SAT: Practice Test.pdf'
  }));

  assert.equal(name, 'SAT_ Practice Test.pdf');
});

test('rejects invalid PDF MIME, extension, and oversized uploads', async () => {
  const pdf = createTextPdf('Valid PDF bytes for upload validation.');

  await assert.rejects(
    validatePdfUploadFile(uploadFile(pdf, { mimetype: 'text/plain' })),
    /Only PDF files/
  );
  await assert.rejects(
    validatePdfUploadFile(uploadFile(pdf, { originalname: 'exam.txt' })),
    /\.pdf extension/
  );
  await assert.rejects(
    validatePdfUploadFile(uploadFile(pdf, { size: PDF_IMPORT_MAX_BYTES + 1 })),
    /15 MB or smaller/
  );
});

test('extracts text and page metadata from a text-layer PDF', async () => {
  const pdf = createTextPdf('Question 1: Which choice is correct? A. Three B. Four C. Five D. Six');
  const extraction = await extractPdfPages(pdf);

  assert.equal(extraction.pageCount, 1);
  assert.match(extraction.pages[0].text, /Which choice is correct/);
  assert.equal(extraction.pages[0].ocrNeeded, false);
  assert.deepEqual(extraction.ocrNeededPages, []);
});

test('marks a page with little extractable text as OCR-needed', async () => {
  const extraction = await extractPdfPages(createTextPdf('Image'));

  assert.equal(extraction.pages[0].ocrNeeded, true);
  assert.deepEqual(extraction.ocrNeededPages, [1]);
});

test('returns a safe error for a malformed structured AI response', async () => {
  const client = {
    responses: {
      async create() {
        return { output_text: '{}', model: 'test-model' };
      }
    }
  };

  await assert.rejects(
    parsePdfChunks([[{ pageNumber: 1, text: 'Question 1' }]], { client }),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.match(error.message, /invalid import preview/i);
      return true;
    }
  );
});

test('keeps valid questions while marking partial invalid questions', () => {
  const questions = validateDraftQuestions([
    validQuestion(),
    validQuestion({ questionText: '', type: 'unsupported', sourcePage: 3 })
  ], { pageCount: 1 });

  assert.equal(questions[0].status, 'READY');
  assert.equal(questions[0].correctAnswer, 'B');
  assert.equal(questions[1].status, 'INVALID');
  assert.match(questions[1].warnings.join(' '), /Question text is missing/);
  assert.match(questions[1].warnings.join(' '), /Question type is missing or invalid/);
  assert.match(questions[1].warnings.join(' '), /outside the uploaded PDF/);
});

test('marks a missing correct answer for review without fabricating one', () => {
  const [question] = validateDraftQuestions([
    validQuestion({ correctAnswer: null })
  ], { pageCount: 1 });

  assert.equal(question.status, 'NEEDS_REVIEW');
  assert.equal(question.correctAnswer, null);
  assert.match(question.warnings.join(' '), /Correct answer is missing/);
});

test('marks every repeated question as a possible within-PDF duplicate', () => {
  const questions = validateDraftQuestions([
    validQuestion(),
    validQuestion({ questionNumber: '2' })
  ], { pageCount: 1 });

  assert.deepEqual(questions.map((question) => question.status), [
    'NEEDS_REVIEW',
    'NEEDS_REVIEW'
  ]);
  assert.equal(questions.every((question) => question.warnings.some((warning) => warning.includes('duplicate'))), true);
});

test('builds a memory-only preview with counts and temporary IDs', async () => {
  const client = {
    responses: {
      async create() {
        return {
          id: 'response-1',
          model: 'test-model',
          output_text: JSON.stringify({
            examTitle: 'Imported Practice Test',
            passages: [],
            questions: [validQuestion()],
            warnings: []
          }),
          usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 }
        };
      }
    }
  };
  const originalInfo = console.info;
  console.info = () => {};
  try {
    const preview = await createPdfImportPreview({
      buffer: Buffer.from('memory-only'),
      fileName: 'practice.pdf',
      requestId: 'test-request',
      client,
      extract: async () => ({
        pageCount: 1,
        pages: [{ pageNumber: 1, text: 'Question text and answer choices', ocrNeeded: false }],
        extractedCharacterCount: 32,
        ocrNeededPages: []
      })
    });

    assert.equal(preview.totalDetected, 1);
    assert.equal(preview.ready, 1);
    assert.equal(preview.questions[0].temporaryId, 'draft-question-1');
    assert.equal(preview.examDraft.sections[0].temporaryId, 'draft-section-1');
  } finally {
    console.info = originalInfo;
  }
});

test('requires authentication before PDF import', async () => {
  const result = await middlewareResult(requireAuth, { headers: {} });

  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('allows only active admins or approved teachers to manage PDF imports', async () => {
  const admin = await middlewareResult(requireExamManager, {
    user: { role: 'ADMIN', status: 'ACTIVE' }
  });
  const student = await middlewareResult(requireExamManager, {
    user: { role: 'STUDENT', status: 'ACTIVE' }
  });

  assert.equal(admin.nextCalled, true);
  assert.equal(student.statusCode, 403);
  assert.equal(student.nextCalled, false);
});
