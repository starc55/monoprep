import { normalizeOptionValue, normalizeTextAnswer, percentage } from '../utils/normalize.js';

function compareSingleChoice(correctAnswer, answer) {
  const expected = normalizeOptionValue(correctAnswer?.value ?? correctAnswer?.label ?? correctAnswer);
  const actual = normalizeOptionValue(answer?.value ?? answer?.label ?? answer);
  return expected === actual;
}

function compareMultiChoice(correctAnswer, answer) {
  const expected = normalizeOptionValue(correctAnswer?.values ?? correctAnswer ?? []);
  const actual = normalizeOptionValue(answer?.values ?? answer ?? []);
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function compareTextInput(question, answer) {
  const correctAnswer = question.correctAnswer;
  const accepted = question.acceptedAnswers
    || correctAnswer?.acceptedAnswers
    || correctAnswer?.values
    || [correctAnswer?.value ?? correctAnswer];
  const actual = normalizeTextAnswer(answer?.value ?? answer);
  return accepted.some((entry) => normalizeTextAnswer(entry) === actual);
}

export function evaluateAnswer(question, answerValue) {
  if (answerValue === undefined || answerValue === null || answerValue === '') {
    return false;
  }

  switch (question.type) {
    case 'multi_choice':
      return compareMultiChoice(question.correctAnswer, answerValue);
    case 'text_input':
      return compareTextInput(question, answerValue);
    case 'math_question':
      return question.acceptedAnswers || !question.options?.length
        ? compareTextInput(question, answerValue)
        : compareSingleChoice(question.correctAnswer, answerValue);
    case 'single_choice':
    case 'passage_question':
    case 'audio_question':
    default:
      return compareSingleChoice(question.correctAnswer, answerValue);
  }
}

export function buildScoreSummary(exam, questionResults) {
  const totalQuestions = questionResults.length;
  const correctCount = questionResults.filter((item) => item.isCorrect).length;
  const sections = exam.sections
    .filter((section) => section.type !== 'listening')
    .map((section) => {
    const sectionResults = questionResults.filter((item) => item.sectionId === section.id);
    const sectionCorrect = sectionResults.filter((item) => item.isCorrect).length;

    return {
      sectionId: section.id,
      title: section.title,
      type: section.type,
      totalQuestions: sectionResults.length,
      correctCount: sectionCorrect,
      score: percentage(sectionCorrect, sectionResults.length)
    };
  });

  const findSectionScore = (type) => {
    const matching = sections.filter((section) => section.type === type);
    if (!matching.length) {
      return 0;
    }
    const correct = matching.reduce((sum, section) => sum + section.correctCount, 0);
    const total = matching.reduce((sum, section) => sum + section.totalQuestions, 0);
    return percentage(correct, total);
  };

  return {
    totalScore: percentage(correctCount, totalQuestions),
    correctCount,
    totalQuestions,
    readingWritingScore: findSectionScore('reading_writing'),
    mathScore: findSectionScore('math'),
    listeningScore: findSectionScore('listening'),
    sectionScores: sections
  };
}
