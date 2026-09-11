import { normalizeOptionValue, normalizeTextAnswer, percentage } from "../utils/normalize.js";

const DIFFICULTY_WEIGHTS = {
  EASY: 0.94,
  MEDIUM: 1,
  HARD: 1.06,
};

const SAT_SCORE_ANCHORS = [
  [0, 200],
  [0.1, 260],
  [0.2, 320],
  [0.3, 370],
  [0.4, 420],
  [0.5, 480],
  [0.6, 540],
  [0.7, 610],
  [0.8, 680],
  [0.9, 740],
  [1, 800],
];

const MIN_SECTION_SCORE = 200;
const MAX_SECTION_SCORE = 800;
const LOWER_ROUTE_CEILING = 650;

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
  if (answerValue === undefined || answerValue === null || answerValue === "") {
    return false;
  }

  switch (question.type) {
    case "multi_choice":
      return compareMultiChoice(question.correctAnswer, answerValue);
    case "text_input":
      return compareTextInput(question, answerValue);
    case "math_question":
      return question.acceptedAnswers || !question.options?.length
        ? compareTextInput(question, answerValue)
        : compareSingleChoice(question.correctAnswer, answerValue);
    case "single_choice":
    case "passage_question":
    case "audio_question":
    default:
      return compareSingleChoice(question.correctAnswer, answerValue);
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundToTen(value) {
  return Math.round(value / 10) * 10;
}

function interpolateSatScore(ratio) {
  const normalizedRatio = clamp(ratio, 0, 1);
  const upperIndex = SAT_SCORE_ANCHORS.findIndex(([anchorRatio]) => anchorRatio >= normalizedRatio);
  if (upperIndex <= 0) return SAT_SCORE_ANCHORS[0][1];

  const [lowerRatio, lowerScore] = SAT_SCORE_ANCHORS[upperIndex - 1];
  const [upperRatio, upperScore] = SAT_SCORE_ANCHORS[upperIndex];
  const progress = (normalizedRatio - lowerRatio) / (upperRatio - lowerRatio);
  return roundToTen(lowerScore + progress * (upperScore - lowerScore));
}

function weightedCorrectRatio(results) {
  const totalWeight = results.reduce((sum, item) => (
    sum + (DIFFICULTY_WEIGHTS[String(item.question.difficulty || "MEDIUM").toUpperCase()] || 1)
  ), 0);
  if (!totalWeight) return 0;

  const earnedWeight = results.reduce((sum, item) => {
    if (!item.isCorrect) return sum;
    return sum + (DIFFICULTY_WEIGHTS[String(item.question.difficulty || "MEDIUM").toUpperCase()] || 1);
  }, 0);
  return earnedWeight / totalWeight;
}

function normalizeConversionTable(table) {
  if (Array.isArray(table)) {
    return table.reduce((result, entry) => {
      if (entry && Number.isFinite(Number(entry.raw)) && Number.isFinite(Number(entry.scaled))) {
        result[String(Number(entry.raw))] = Number(entry.scaled);
      }
      return result;
    }, {});
  }
  return table && typeof table === "object" ? table : null;
}

function getConfiguredScore(exam, sectionType, rawCorrect, route) {
  const sectionConfig = exam.scoreConversion?.[sectionType];
  if (!sectionConfig) return null;

  const routeConfig = route ? sectionConfig.routes?.[route] : null;
  const table = normalizeConversionTable(
    routeConfig?.rawToScaled
      ?? routeConfig
      ?? sectionConfig.rawToScaled
      ?? sectionConfig
  );
  if (!table) return null;

  const exact = Number(table[String(rawCorrect)]);
  if (Number.isFinite(exact)) {
    return clamp(roundToTen(exact), MIN_SECTION_SCORE, MAX_SECTION_SCORE);
  }

  const points = Object.entries(table)
    .map(([raw, scaled]) => ({ raw: Number(raw), scaled: Number(scaled) }))
    .filter((entry) => Number.isFinite(entry.raw) && Number.isFinite(entry.scaled))
    .sort((a, b) => a.raw - b.raw);
  if (!points.length) return null;
  if (rawCorrect <= points[0].raw) return clamp(roundToTen(points[0].scaled), 200, 800);
  if (rawCorrect >= points.at(-1).raw) return clamp(roundToTen(points.at(-1).scaled), 200, 800);

  const upperIndex = points.findIndex((entry) => entry.raw > rawCorrect);
  const lower = points[upperIndex - 1];
  const upper = points[upperIndex];
  const ratio = (rawCorrect - lower.raw) / (upper.raw - lower.raw);
  return clamp(roundToTen(lower.scaled + ratio * (upper.scaled - lower.scaled)), 200, 800);
}

function estimateSectionScore(exam, sectionType, results, selectedRoutes) {
  if (!results.length) return 0;
  const rawCorrect = results.filter((item) => item.isCorrect).length;
  const route = selectedRoutes?.[sectionType] || null;
  const configuredScore = getConfiguredScore(exam, sectionType, rawCorrect, route);
  if (configuredScore !== null) return configuredScore;

  let scaledScore = interpolateSatScore(weightedCorrectRatio(results));
  if (route === "LOWER") {
    scaledScore = Math.min(scaledScore, LOWER_ROUTE_CEILING);
  }
  return clamp(scaledScore, MIN_SECTION_SCORE, MAX_SECTION_SCORE);
}

function buildRawPercentageSummary(exam, questionResults) {
  const totalQuestions = questionResults.length;
  const correctCount = questionResults.filter((item) => item.isCorrect).length;
  const sections = exam.sections
    .filter((section) => section.type !== "listening")
    .map((section) => {
      const sectionResults = questionResults.filter((item) => item.sectionId === section.id);
      const sectionCorrect = sectionResults.filter((item) => item.isCorrect).length;
      return {
        sectionId: section.id,
        title: section.title,
        type: section.type,
        totalQuestions: sectionResults.length,
        correctCount: sectionCorrect,
        score: percentage(sectionCorrect, sectionResults.length),
      };
    });
  const findSectionScore = (type) => {
    const matching = sections.filter((section) => section.type === type);
    const correct = matching.reduce((sum, section) => sum + section.correctCount, 0);
    const total = matching.reduce((sum, section) => sum + section.totalQuestions, 0);
    return percentage(correct, total);
  };

  return {
    totalScore: percentage(correctCount, totalQuestions),
    correctCount,
    totalQuestions,
    readingWritingScore: findSectionScore("reading_writing"),
    mathScore: findSectionScore("math"),
    listeningScore: 0,
    scoringModel: "RAW_PERCENT",
    isEstimated: false,
    sectionScores: sections,
  };
}

export function buildScoreSummary(exam, questionResults, options = {}) {
  const scoredResults = questionResults.filter((item) => !item.question.isPretest);
  if (exam.scoringModel === "RAW_PERCENT") {
    return buildRawPercentageSummary(exam, scoredResults);
  }

  const typeBySectionId = new Map(exam.sections.map((section) => [section.id, section.type]));
  const resultsForType = (type) => scoredResults.filter(
    (item) => typeBySectionId.get(item.sectionId) === type
  );
  const readingWritingResults = resultsForType("reading_writing");
  const mathResults = resultsForType("math");
  const readingWritingScore = estimateSectionScore(
    exam,
    "reading_writing",
    readingWritingResults,
    options.selectedRoutes
  );
  const mathScore = estimateSectionScore(exam, "math", mathResults, options.selectedRoutes);
  const availableScores = [readingWritingScore, mathScore].filter((score) => score > 0);
  const correctCount = scoredResults.filter((item) => item.isCorrect).length;
  const sectionScores = exam.sections
    .filter((section) => section.type !== "listening")
    .map((section) => {
      const results = scoredResults.filter((item) => item.sectionId === section.id);
      const correct = results.filter((item) => item.isCorrect).length;
      const allSectionResults = questionResults.filter((item) => item.sectionId === section.id);
      return {
        sectionId: section.id,
        title: section.title,
        type: section.type,
        adaptiveRole: section.adaptiveRole || "STANDARD",
        totalQuestions: results.length,
        pretestQuestions: allSectionResults.length - results.length,
        correctCount: correct,
        score: percentage(correct, results.length),
      };
    });

  return {
    totalScore: availableScores.reduce((sum, score) => sum + score, 0),
    correctCount,
    totalQuestions: scoredResults.length,
    readingWritingScore,
    mathScore,
    listeningScore: 0,
    scoringModel: "SAT_ESTIMATE_V1",
    isEstimated: true,
    sectionScores,
  };
}
