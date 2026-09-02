import assert from "node:assert/strict";
import test from "node:test";
import { buildScoreSummary } from "./scoring.service.js";

function makeResults(sectionId, count, correctCount, options = {}) {
  return Array.from({ length: count }, (_, index) => ({
    sectionId,
    question: {
      id: `${sectionId}-${index}`,
      difficulty: index % 3 === 0 ? "EASY" : index % 3 === 1 ? "MEDIUM" : "HARD",
      type: "single_choice",
      options: [{ id: "A" }],
      isPretest: options.pretestIndex === index,
    },
    isCorrect: index < correctCount,
  }));
}

test("SAT estimate returns 400-1600 scaled scores and excludes pretest items", () => {
  const sections = [
    { id: "rw", title: "Reading", type: "reading_writing", adaptiveRole: "STANDARD" },
    { id: "math", title: "Math", type: "math", adaptiveRole: "STANDARD" },
  ];
  const results = [
    ...makeResults("rw", 10, 8, { pretestIndex: 9 }),
    ...makeResults("math", 10, 7, { pretestIndex: 9 }),
  ];
  const summary = buildScoreSummary({ sections, scoringModel: "SAT_ESTIMATE_V1" }, results);

  assert.equal(summary.totalQuestions, 18);
  assert.equal(summary.totalScore, summary.readingWritingScore + summary.mathScore);
  assert.ok(summary.totalScore >= 400 && summary.totalScore <= 1600);
  assert.equal(summary.sectionScores[0].pretestQuestions, 1);
});

test("lower adaptive route applies the estimate ceiling", () => {
  const sections = [{ id: "math", title: "Math", type: "math", adaptiveRole: "MODULE_2_LOWER" }];
  const results = makeResults("math", 10, 10);
  const summary = buildScoreSummary(
    { sections, scoringModel: "SAT_ESTIMATE_V1" },
    results,
    { selectedRoutes: { math: "LOWER" } }
  );

  assert.equal(summary.mathScore, 650);
});

test("an exam-specific conversion table overrides the estimate", () => {
  const sections = [{ id: "rw", title: "Reading", type: "reading_writing", adaptiveRole: "STANDARD" }];
  const results = makeResults("rw", 5, 4);
  const summary = buildScoreSummary({
    sections,
    scoringModel: "SAT_ESTIMATE_V1",
    scoreConversion: { reading_writing: { rawToScaled: { 4: 710 } } },
  }, results);

  assert.equal(summary.readingWritingScore, 710);
});

test("legacy raw percentage mode remains available", () => {
  const sections = [{ id: "rw", title: "Reading", type: "reading_writing" }];
  const summary = buildScoreSummary(
    { sections, scoringModel: "RAW_PERCENT" },
    makeResults("rw", 10, 6)
  );

  assert.equal(summary.totalScore, 60);
  assert.equal(summary.readingWritingScore, 60);
});
