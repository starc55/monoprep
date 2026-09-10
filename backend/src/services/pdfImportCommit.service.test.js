import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPdfImportPlan, commitPdfImport } from './pdfImportCommit.service.js';

function payload() {
  return {
    setup: {
      title: 'Imported SAT Practice',
      description: 'Imported exam ready for administrator review.',
      type: 'FULL_LENGTH',
      accessType: 'FREE',
      source: 'OFFICIAL',
      totalDuration: 134
    },
    draft: {
      passages: [{
        temporaryId: 'passage-1',
        title: null,
        content: 'A sufficiently long reading passage imported from the source PDF.',
        sourcePage: 2
      }],
      questions: [{
        temporaryId: 'question-1',
        status: 'READY',
        questionText: 'Which choice best states the main idea?',
        type: 'passage_question',
        skill: 'Central Ideas and Details',
        difficulty: 'MEDIUM',
        sectionTitle: 'Reading and Writing',
        sectionType: 'reading_writing',
        moduleTitle: 'Reading and Writing Module 1',
        passageTempId: 'passage-1',
        options: [
          { label: 'A', text: 'First choice' },
          { label: 'B', text: 'Second choice' }
        ],
        correctAnswer: 'B',
        explanation: 'The second choice is supported directly by the passage.'
      }]
    }
  };
}

test('builds an atomic import plan with modules, passages, and answer choices', () => {
  const plan = buildPdfImportPlan(payload());

  assert.equal(plan.exam.isPublished, false);
  assert.equal(plan.modules.length, 1);
  assert.equal(plan.passages.length, 1);
  assert.equal(plan.modules[0].questions[0].passageTempId, 'passage-1');
  assert.equal(plan.modules[0].questions[0].acceptedAnswers, undefined);
  assert.deepEqual(plan.modules[0].questions[0].options.map((option) => option.isCorrect), [false, true]);
});

test('normalizes duplicate answer labels before the database transaction', () => {
  const input = payload();
  input.draft.questions[0].options = [
    { label: 'B', text: 'First choice' },
    { label: 'B', text: 'Second choice' },
    { label: '', text: 'Third choice' }
  ];

  const plan = buildPdfImportPlan(input);
  assert.deepEqual(plan.modules[0].questions[0].options.map((option) => option.label), ['B', 'A', 'C']);
});

test('uses an import-sized timeout for the atomic database transaction', async () => {
  let transactionOptions;
  const transaction = {
    exam: {
      create: async () => ({ id: 'exam-1' }),
      findUnique: async () => ({ id: 'exam-1', title: 'Imported SAT Practice' })
    },
    passage: { create: async () => ({ id: 'passage-db-1' }) },
    section: { create: async () => ({ id: 'section-1' }) },
    question: { create: async () => ({ id: 'question-1' }) }
  };
  const db = {
    $transaction: async (callback, options) => {
      transactionOptions = options;
      return callback(transaction);
    }
  };

  const result = await commitPdfImport(payload(), db);

  assert.equal(result.importedQuestions, 1);
  assert.deepEqual(transactionOptions, { maxWait: 15000, timeout: 180000 });
});

test('skips an ungradable student-produced response', () => {
  const input = payload();
  input.draft.questions.push({
    ...input.draft.questions[0],
    temporaryId: 'question-2',
    type: 'text_input',
    sectionType: 'math',
    sectionTitle: 'Math',
    moduleTitle: 'Math Module 1',
    options: [],
    correctAnswer: null
  });

  const plan = buildPdfImportPlan(input);
  assert.equal(plan.skipped.length, 1);
  assert.match(plan.skipped[0].reason, /accepted answer/i);
});
