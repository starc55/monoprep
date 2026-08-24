import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { openai } from "../config/openai.js";
import { ApiError } from "../utils/apiError.js";
import { buildFallbackFeedback } from "../utils/aiFallback.js";
import { buildAttemptSummaryForAI, getAttemptById } from "./attempt.service.js";

async function saveFeedback(attemptId, userId, feedback) {
  const created = await prisma.aiFeedback.upsert({
    where: { attemptId },
    update: { feedback },
    create: {
      attemptId,
      userId,
      feedback,
    },
  });

  return created.feedback;
}

function normalizeFeedback(candidate, fallback) {
  return {
    overallFeedback: candidate?.overallFeedback || fallback.overallFeedback,
    estimatedScore: {
      total: Number(
        candidate?.estimatedScore?.total ?? fallback.estimatedScore.total
      ),
      readingWriting: Number(
        candidate?.estimatedScore?.readingWriting ??
          fallback.estimatedScore.readingWriting
      ),
      math: Number(
        candidate?.estimatedScore?.math ?? fallback.estimatedScore.math
      ),
      listening: Number(
        candidate?.estimatedScore?.listening ??
          fallback.estimatedScore.listening
      ),
    },
    strengths: Array.isArray(candidate?.strengths)
      ? candidate.strengths
      : fallback.strengths,
    weaknesses: Array.isArray(candidate?.weaknesses)
      ? candidate.weaknesses
      : fallback.weaknesses,
    skillBreakdown: Array.isArray(candidate?.skillBreakdown)
      ? candidate.skillBreakdown
      : fallback.skillBreakdown,
    timeManagement: candidate?.timeManagement || fallback.timeManagement,
    questionAnalysis: Array.isArray(candidate?.questionAnalysis)
      ? candidate.questionAnalysis
      : fallback.questionAnalysis,
    studyRoadmap: Array.isArray(candidate?.studyRoadmap)
      ? candidate.studyRoadmap
      : fallback.studyRoadmap,
    recommendedPractice: Array.isArray(candidate?.recommendedPractice)
      ? candidate.recommendedPractice
      : fallback.recommendedPractice,
  };
}

export async function generateFeedbackForAttempt(attemptId, user) {
  const attempt = await getAttemptById(attemptId, user, true);

  if (attempt.status === "IN_PROGRESS") {
    throw new ApiError(
      400,
      "Submit the attempt before generating AI feedback."
    );
  }

  const summary = buildAttemptSummaryForAI(attempt);
  const fallback = buildFallbackFeedback(summary);

  if (!openai) {
    return saveFeedback(attemptId, attempt.userId, fallback);
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openAiModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert SAT coach. Return strict JSON only with keys: overallFeedback, estimatedScore, strengths, weaknesses, skillBreakdown, timeManagement, questionAnalysis, studyRoadmap, recommendedPractice.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Generate coaching feedback based only on this SAT-style attempt summary.",
            requiredShape: fallback,
            summary,
          }),
        },
      ],
    });

    const parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    return saveFeedback(
      attemptId,
      attempt.userId,
      normalizeFeedback(parsed, fallback)
    );
  } catch (error) {
    return saveFeedback(attemptId, attempt.userId, fallback);
  }
}

export async function getFeedbackForAttempt(attemptId, user) {
  const attempt = await getAttemptById(attemptId, user, true);
  return attempt.aiFeedback;
}
