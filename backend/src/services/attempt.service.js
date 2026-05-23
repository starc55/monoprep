import { prisma } from "../config/prisma.js";
import { attemptReviewInclude, examDeepInclude } from "../prisma/selects.js";
import { ApiError } from "../utils/apiError.js";
import { buildScoreSummary, evaluateAnswer } from "./scoring.service.js";

function sanitizeQuestion(question, includeCorrectAnswers = false) {
  return {
    id: question.id,
    sectionId: question.sectionId,
    passageId: question.passageId,
    type: question.type,
    skill: question.skill,
    difficulty: question.difficulty,
    questionText: question.questionText,
    audioUrl: question.audioUrl,
    audioTitle: question.audioTitle,
    instructions: question.instructions,
    imageUrl: question.imageUrl,
    formulaText: question.formulaText,
    tableData: question.tableData,
    calculatorAllowed: question.calculatorAllowed,
    audioReplayLimit: question.audioReplayLimit,
    order: question.order,
    passage: question.passage,
    options: (question.options || []).map((option) => ({
      id: option.id,
      label: option.label,
      text: option.text,
      ...(includeCorrectAnswers ? { isCorrect: option.isCorrect } : {}),
    })),
    ...(includeCorrectAnswers
      ? {
          correctAnswer: question.correctAnswer,
          acceptedAnswers: question.acceptedAnswers,
          transcript: question.transcript,
          explanation: question.explanation,
        }
      : {}),
  };
}

function sanitizeExam(
  exam,
  includeQuestions = true,
  includeCorrectAnswers = false
) {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    type: exam.type,
    totalDuration: exam.totalDuration,
    isPublished: exam.isPublished,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    sections: (exam.sections || []).map((section) => ({
      id: section.id,
      examId: section.examId,
      title: section.title,
      type: section.type,
      duration: section.duration,
      order: section.order,
      questionsCount: section.questions?.length || 0,
      questions: includeQuestions
        ? (section.questions || []).map((question) =>
            sanitizeQuestion(question, includeCorrectAnswers)
          )
        : undefined,
    })),
  };
}

function mapAnswer(answer) {
  if (!answer) {
    return null;
  }

  return {
    id: answer.id,
    attemptId: answer.attemptId,
    questionId: answer.questionId,
    answer: answer.answer,
    isCorrect: answer.isCorrect,
    timeSpent: answer.timeSpent,
    markedForReview: answer.markedForReview,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
  };
}

export async function listExamsForUser(user) {
  const exams = await prisma.exam.findMany({
    where: user.role === "ADMIN" ? {} : { isPublished: true },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          questions: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return exams.map((exam) => sanitizeExam(exam, false, false));
}

export async function getExamForUser(examId, user) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examDeepInclude,
  });

  if (!exam) {
    throw new ApiError(404, "Exam not found.");
  }

  if (!exam.isPublished && user.role !== "ADMIN") {
    throw new ApiError(403, "This exam is not available yet.");
  }

  return sanitizeExam(exam, true, user.role === "ADMIN");
}

export async function startAttemptForUser(userId, examId) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examDeepInclude,
  });

  if (!exam || !exam.isPublished) {
    throw new ApiError(404, "Published exam not found.");
  }

  const existingAttempt = await prisma.attempt.findFirst({
    where: {
      userId,
      examId,
      status: "IN_PROGRESS",
    },
    include: attemptReviewInclude,
  });

  if (existingAttempt) {
    return buildAttemptResponse(existingAttempt, false);
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      examId,
    },
  });

  return attempt;
}

export async function saveAttemptAnswer(attemptId, userId, payload) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: examDeepInclude,
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    throw new ApiError(404, "Attempt not found.");
  }

  if (attempt.status !== "IN_PROGRESS") {
    throw new ApiError(400, "This attempt has already been submitted.");
  }

  const question = attempt.exam.sections
    .flatMap((section) => section.questions)
    .find((entry) => entry.id === payload.questionId);

  if (!question) {
    throw new ApiError(404, "Question not found in this exam.");
  }

  const saved = await prisma.userAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId: payload.questionId,
      },
    },
    update: {
      answer: payload.answer,
      timeSpent: payload.timeSpent ?? 0,
      markedForReview: payload.markedForReview ?? false,
    },
    create: {
      attemptId,
      questionId: payload.questionId,
      answer: payload.answer,
      timeSpent: payload.timeSpent ?? 0,
      markedForReview: payload.markedForReview ?? false,
    },
  });

  return mapAnswer(saved);
}

function buildQuestionAnalysis(questionResults) {
  return questionResults.map((item) => ({
    questionId: item.question.id,
    isCorrect: item.isCorrect,
    explanation: item.question.explanation,
    whyCorrectAnswerIsRight: item.isCorrect
      ? "You selected the correct answer based on the underlying concept tested."
      : `The correct answer aligns with the question objective and the tested skill: ${item.question.skill}.`,
    whyStudentAnswerIsWrong: item.isCorrect
      ? "Your answer matched the expected response."
      : "Your response did not fully match the stored objective answer for this question.",
    relatedSkill: item.question.skill,
  }));
}

function buildSkillBreakdown(questionResults) {
  const skillMap = new Map();

  questionResults.forEach((item) => {
    const current = skillMap.get(item.question.skill) || {
      skill: item.question.skill,
      total: 0,
      correct: 0,
    };

    current.total += 1;
    if (item.isCorrect) {
      current.correct += 1;
    }

    skillMap.set(item.question.skill, current);
  });

  return [...skillMap.values()].map((entry) => {
    const accuracy = Math.round((entry.correct / entry.total) * 100);
    return {
      skill: entry.skill,
      accuracy,
      comment:
        accuracy >= 80
          ? "A reliable area of performance."
          : accuracy >= 60
          ? "A developing skill that needs more consistency."
          : "A priority area for focused practice.",
    };
  });
}

async function updateSkillStats(userId, questionResults) {
  const skillMap = new Map();

  questionResults.forEach((item) => {
    const current = skillMap.get(item.question.skill) || {
      skill: item.question.skill,
      total: 0,
      correct: 0,
    };

    current.total += 1;
    if (item.isCorrect) {
      current.correct += 1;
    }

    skillMap.set(item.question.skill, current);
  });

  await Promise.all(
    [...skillMap.values()].map(async (entry) => {
      const existing = await prisma.skillStat.findUnique({
        where: {
          userId_skill: {
            userId,
            skill: entry.skill,
          },
        },
      });

      const questionsSeen = (existing?.questionsSeen || 0) + entry.total;
      const questionsCorrect =
        (existing?.questionsCorrect || 0) + entry.correct;
      const accuracy = questionsSeen
        ? Math.round((questionsCorrect / questionsSeen) * 100)
        : 0;

      return prisma.skillStat.upsert({
        where: {
          userId_skill: {
            userId,
            skill: entry.skill,
          },
        },
        update: {
          questionsSeen,
          questionsCorrect,
          accuracy,
        },
        create: {
          userId,
          skill: entry.skill,
          questionsSeen,
          questionsCorrect,
          accuracy,
        },
      });
    })
  );
}

export async function submitAttempt(attemptId, userId) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: attemptReviewInclude,
  });

  if (!attempt || attempt.userId !== userId) {
    throw new ApiError(404, "Attempt not found.");
  }

  if (attempt.status !== "IN_PROGRESS") {
    return buildAttemptResponse(attempt, true);
  }

  const answersByQuestionId = new Map(
    attempt.answers.map((answer) => [answer.questionId, answer])
  );

  const questionResults = attempt.exam.sections.flatMap((section) =>
    section.questions.map((question) => {
      const savedAnswer = answersByQuestionId.get(question.id);
      const isCorrect = evaluateAnswer(question, savedAnswer?.answer);

      return {
        sectionId: section.id,
        question,
        savedAnswer,
        isCorrect,
      };
    })
  );

  await Promise.all(
    questionResults
      .filter((item) => item.savedAnswer)
      .map((item) =>
        prisma.userAnswer.update({
          where: { id: item.savedAnswer.id },
          data: { isCorrect: item.isCorrect },
        })
      )
  );

  const scoreSummary = buildScoreSummary(attempt.exam, questionResults);
  const submittedAt = new Date();
  const timeSpent = Math.max(
    1,
    Math.floor(
      (submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000
    )
  );

  const updatedAttempt = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt,
      timeSpent,
      totalScore: scoreSummary.totalScore,
      readingWritingScore: scoreSummary.readingWritingScore,
      mathScore: scoreSummary.mathScore,
      listeningScore: scoreSummary.listeningScore,
    },
    include: attemptReviewInclude,
  });

  await updateSkillStats(userId, questionResults);

  return buildAttemptResponse(updatedAttempt, true);
}

export async function getAttemptById(attemptId, user, includeCorrectAnswers) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: attemptReviewInclude,
  });

  if (!attempt) {
    throw new ApiError(404, "Attempt not found.");
  }

  if (user.role !== "ADMIN" && attempt.userId !== user.id) {
    throw new ApiError(403, "You cannot access this attempt.");
  }

  const allowCorrectAnswers =
    includeCorrectAnswers ||
    attempt.status !== "IN_PROGRESS" ||
    user.role === "ADMIN";

  return buildAttemptResponse(attempt, allowCorrectAnswers);
}

export async function listAttemptsForUser(userId) {
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    include: {
      exam: true,
      aiFeedback: true,
      answers: true,
    },
    orderBy: { startedAt: "desc" },
  });

  return attempts.map((attempt) => ({
    id: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    totalScore: attempt.totalScore,
    readingWritingScore: attempt.readingWritingScore,
    mathScore: attempt.mathScore,
    listeningScore: attempt.listeningScore,
    timeSpent: attempt.timeSpent,
    answersCount: attempt.answers.length,
    hasAiFeedback: Boolean(attempt.aiFeedback),
  }));
}

export async function listAllAttemptsForAdmin() {
  const attempts = await prisma.attempt.findMany({
    include: {
      exam: true,
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      aiFeedback: true,
      answers: true,
    },
    orderBy: { startedAt: "desc" },
  });

  return attempts.map((attempt) => ({
    id: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    student: attempt.user.fullName,
    email: attempt.user.email,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    totalScore: attempt.totalScore,
    readingWritingScore: attempt.readingWritingScore,
    mathScore: attempt.mathScore,
    listeningScore: attempt.listeningScore,
    timeSpent: attempt.timeSpent,
    answersCount: attempt.answers.length,
    hasAiFeedback: Boolean(attempt.aiFeedback),
  }));
}

export function buildAttemptSummaryForAI(attemptResponse) {
  const questionAnalysis = attemptResponse.exam.sections.flatMap((section) =>
    section.questions.map((question) => {
      const userAnswer = attemptResponse.answers.find(
        (entry) => entry.questionId === question.id
      );
      const isCorrect = Boolean(userAnswer?.isCorrect);

      return {
        questionId: question.id,
        isCorrect,
        explanation: question.explanation,
        whyCorrectAnswerIsRight: question.explanation,
        whyStudentAnswerIsWrong: isCorrect
          ? "The student answered correctly."
          : "The student answer did not match the stored correct response.",
        relatedSkill: question.skill,
      };
    })
  );

  const skillBreakdown = buildSkillBreakdown(
    attemptResponse.exam.sections.flatMap((section) =>
      section.questions.map((question) => ({
        question,
        isCorrect: Boolean(
          attemptResponse.answers.find(
            (answer) => answer.questionId === question.id
          )?.isCorrect
        ),
      }))
    )
  );

  return {
    attemptId: attemptResponse.id,
    examTitle: attemptResponse.exam.title,
    totalScore: attemptResponse.totalScore || 0,
    readingWritingScore: attemptResponse.readingWritingScore || 0,
    mathScore: attemptResponse.mathScore || 0,
    listeningScore: attemptResponse.listeningScore || 0,
    timeSpent: attemptResponse.timeSpent || 0,
    recommendedTime: attemptResponse.exam.totalDuration * 60,
    skillBreakdown,
    questionAnalysis,
  };
}

export function buildAttemptResponse(attempt, includeCorrectAnswers) {
  const exam = sanitizeExam(attempt.exam, true, includeCorrectAnswers);

  return {
    id: attempt.id,
    userId: attempt.userId,
    examId: attempt.examId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    totalScore: attempt.totalScore,
    readingWritingScore: attempt.readingWritingScore,
    mathScore: attempt.mathScore,
    listeningScore: attempt.listeningScore,
    timeSpent: attempt.timeSpent,
    exam,
    answers: attempt.answers.map(mapAnswer),
    aiFeedback: attempt.aiFeedback?.feedback || null,
  };
}
