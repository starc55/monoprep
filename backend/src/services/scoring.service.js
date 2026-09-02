import { normalizeOptionValue, normalizeTextAnswer, percentage } from "../utils/normalize.js";

const DIFFICULTY_PARAMETERS = {
  EASY: -1.1,
  MEDIUM: 0,
  HARD: 1.1,
};

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

function getDifficultyParameter(question) {
  return DIFFICULTY_PARAMETERS[String(question.difficulty || "MEDIUM").toUpperCase()] ?? 0;
}

function isStudentProducedResponse(question) {
  return question.type === "text_input"
    || (question.type === "math_question" && !question.options?.length);
}

function probabilityOfCorrect(theta, question) {
  const discrimination = 1.35;
  const guessing = isStudentProducedResponse(question) ? 0 : 0.25;
  const difficulty = getDifficultyParameter(question);
  return guessing + (1 - guessing) / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

function estimateTheta(results) {
  if (!results.length) return -3.5;
  const correct = results.filter((item) => item.isCorrect).length;
  if (correct === 0) return -3.5;
  if (correct === results.length) return 3.5;

  let bestTheta = -3.5;
  let bestLikelihood = Number.NEGATIVE_INFINITY;

  for (let theta = -3.5; theta <= 3.5001; theta += 0.05) {
    const likelihood = results.reduce((sum, item) => {
      const probability = clamp(probabilityOfCorrect(theta, item.question), 0.000001, 0.999999);
      return sum + (item.isCorrect ? Math.log(probability) : Math.log(1 - probability));
    }, 0);

    if (likelihood > bestLikelihood) {
      bestLikelihood = likelihood;
      bestTheta = theta;
    }
  }

  return bestTheta;
}

function thetaToScaledScore(theta) {
  const percentile = 1 / (1 + Math.exp(-1.08 * theta));
  return roundToTen(MIN_SECTION_SCORE + percentile * (MAX_SECTION_SCORE - MIN_SECTION_SCORE));
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

  let scaledScore = rawCorrect === 0
    ? MIN_SECTION_SCORE
    : rawCorrect === results.length
      ? MAX_SECTION_SCORE
      : thetaToScaledScore(estimateTheta(results));
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
