import assert from 'node:assert/strict';
import test from 'node:test';
import { formatQuestionReportMessage, formatSupportMessage } from './support.service.js';

const user = { fullName: 'Test Student', email: 'student@example.com', role: 'STUDENT' };

test('escapes user content in Telegram support posts', () => {
  const text = formatSupportMessage({
    user,
    contactEmail: 'contact@example.com',
    subject: '<b>Timer</b>',
    message: 'The page shows 5 < 10.',
    pageUrl: 'https://monoprep.vercel.app/support'
  });

  assert.match(text, /&lt;b&gt;Timer&lt;\/b&gt;/);
  assert.match(text, /5 &lt; 10/);
  assert.match(text, /Contact email:<\/b> contact@example.com/);
  assert.doesNotMatch(text, /<b>Timer<\/b>/);
});

test('formats a question report with verified exam context', () => {
  const question = {
    id: 'question-1',
    skill: 'Linear equations',
    questionText: 'What is 2 + 2?',
    correctAnswer: { value: 'B' },
    options: []
  };
  const attempt = {
    id: 'attempt-1',
    exam: { title: 'Practice 1' }
  };
  const section = { title: 'Math Module 1', questions: [question] };

  const text = formatQuestionReportMessage({
    user,
    telegramUsername: '@test_student',
    attempt,
    section,
    question,
    answer: { answer: { value: 'A' } },
    reason: 'INCORRECT_ANSWER',
    message: 'Please check this key.',
    pageUrl: 'https://monoprep.vercel.app/attempts/attempt-1/review'
  });

  assert.match(text, /Incorrect answer key/);
  assert.match(text, /Telegram:<\/b> @test_student/);
  assert.match(text, /Practice 1/);
  assert.match(text, /Math Module 1/);
  assert.match(text, /Student answer:<\/b> A/);
  assert.match(text, /Current correct answer:<\/b> B/);
  assert.match(text, /attempt:attempt-1 question:question-1/);
});
