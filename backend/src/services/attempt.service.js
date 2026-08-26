import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { attemptReviewInclude, examDeepInclude } from "../prisma/selects.js";
import { ApiError } from "../utils/apiError.js";
import { buildScoreSummary, evaluateAnswer } from "./scoring.service.js";
import { evaluateAchievementsForUser } from "./achievement.service.js";
import { createNotification } from "./notification.service.js";

function getActiveSections(sections = []) {
  return sections.filter((section) => section.type !== "listening");
}

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
      imageUrl: option.imageUrl,
      ...(includeCorrectAnswers ? { isCorrect: option.isCorrect } : {}),
    })),
    ...(includeCorrectAnswers
      ? {
          correctAnswer: question.correctAnswer,
          acceptedAnswers: question.acceptedAnswers,
          transcript: question.transcript,
          explanation: question.explanation,
          explanationImageUrl: question.explanationImageUrl,
        }
      : {}),
  };
}

function sanitizeExam(
  exam,
  includeQuestions = true,
  includeCorrectAnswers = false
) {
  const activeSections = getActiveSections(exam.sections || []);
  const lastAttempt = Array.isArray(exam.attempts) ? exam.attempts[0] : null;

  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    type: exam.type,
    accessType: exam.accessType || "FREE",
    contentMode: exam.contentMode || "REAL_EXAM",
    source: exam.source || "MONOPREP",
    competitionKind: exam.competitionKind || "NONE",
    competitionStartsAt: exam.competitionStartsAt || null,
    competitionEndsAt: exam.competitionEndsAt || null,
    referenceText: exam.referenceText || null,
    premium: exam.accessType === "PAID",
    isPremium: exam.accessType === "PAID",
    totalDuration: exam.totalDuration,
    isPublished: exam.isPublished,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    peopleTookCount: exam._count?.attempts ?? 0,
    lastScore: lastAttempt?.totalScore ?? null,
    lastAttemptId: lastAttempt?.id ?? null,
    lastAttemptStatus: lastAttempt?.status ?? null,
    sections: activeSections.map((section) => ({
      id: section.id,
      examId: section.examId,
      title: section.title,
      type: section.type,
      duration: section.duration,
      order: section.order,
      questionsCount: section._count?.questions ?? section.questions?.length ?? 0,
      questions: includeQuestions
        ? (section.questions || []).map((question) =>
            sanitizeQuestion(question, includeCorrectAnswers)
          )
        : undefined,
    })),
  };
}

function canManageExams(user = {}) {
  return Boolean(
    (user.role === "ADMIN" && user.status === "ACTIVE") ||
      (user.role === "TEACHER" &&
        user.status === "ACTIVE" &&
        user.teacherProfile?.status === "APPROVED")
  );
}

function canUsePaidExam(user = {}) {
  return Boolean(
    canManageExams(user) ||
      (user.premiumUntil && new Date(user.premiumUntil) > new Date())
  );
}

function assertExamAccess(exam, user) {
  if (exam.accessType === "PAID" && !canUsePaidExam(user)) {
    throw new ApiError(403, "This exam requires premium access.");
  }
}

function assertCompetitionAccess(exam, user) {
  if (user.role !== "STUDENT" || exam.competitionKind === "NONE") return;
  const now = Date.now();
  const startsAt = exam.competitionStartsAt ? new Date(exam.competitionStartsAt).getTime() : null;
  const endsAt = exam.competitionEndsAt ? new Date(exam.competitionEndsAt).getTime() : null;
  if (startsAt && now < startsAt) {
    throw new ApiError(403, "This competition has not started yet.");
  }
  if (endsAt && now > endsAt) {
    throw new ApiError(410, "This competition has ended.");
  }
}

function getAttemptDeadline(attempt) {
  const sectionDuration = getActiveSections(attempt.exam?.sections || []).reduce(
    (total, section) => total + Math.max(0, Number(section.duration) || 0),
    0
  );
  const examDuration = Math.max(
    sectionDuration,
    Math.max(0, Number(attempt.exam?.totalDuration) || 0)
  );
  if (!examDuration || !attempt.startedAt) {
    return null;
  }

  return new Date(
    new Date(attempt.startedAt).getTime()
      + (examDuration + env.examSubmissionGraceMinutes) * 60 * 1000
  );
}

function assertAttemptAcceptsAnswers(attempt) {
  const deadline = getAttemptDeadline(attempt);
  if (deadline && Date.now() > deadline.getTime()) {
    throw new ApiError(409, 'The server-side exam time limit has expired. Submit the saved answers.', {
      expiredAt: deadline.toISOString()
    });
  }
}

async function runSerializableTransaction(work, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: "Serializable",
        maxWait: 10_000,
        timeout: 30_000,
      });
    } catch (error) {
      if (error?.code !== "P2034" || attempt === retries) {
        throw error;
      }
    }
  }
  throw new ApiError(409, "The attempt changed while it was being submitted. Please retry.");
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
  const canManage = canManageExams(user);
  const include = {
    sections: {
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    },
    _count: {
      select: { attempts: true },
    },
  };

  if (!canManage) {
    include.attempts = {
      where: {
        userId: user.id,
        status: {
          in: ["SUBMITTED", "REVIEWED"],
        },
      },
      orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
      take: 1,
      select: {
        id: true,
        status: true,
        totalScore: true,
      },
    };
  }

  const exams = await prisma.exam.findMany({
    where: canManage ? {} : { isPublished: true },
    include,
    orderBy: { createdAt: "desc" },
  });

  return exams.map((exam) => sanitizeExam(exam, false, false));
}

export async function getExamForUser(examId, user) {
  const canManage = canManageExams(user);
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examDeepInclude,
  });

  if (!exam) {
    throw new ApiError(404, "Exam not found.");
  }

  if (!exam.isPublished && !canManage) {
    throw new ApiError(403, "This exam is not available yet.");
  }

  assertExamAccess(exam, user);
  assertCompetitionAccess(exam, user);

  return sanitizeExam(exam, true, canManage);
}

export async function startAttemptForUser(user, examId) {
  const canManage = canManageExams(user);
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examDeepInclude,
  });

  if (!exam || (!exam.isPublished && !canManage)) {
    throw new ApiError(404, "Published exam not found.");
  }

  const activeQuestionCount = getActiveSections(exam.sections).reduce(
    (total, section) => total + (section.questions?.length || 0),
    0
  );
  if (!activeQuestionCount) {
    throw new ApiError(409, "This exam is still being prepared and has no questions yet.");
  }

  assertExamAccess(exam, user);
  assertCompetitionAccess(exam, user);

  return runSerializableTransaction(async (tx) => {
    const lockKey = `${user.id}:${examId}`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text AS locked`;

    const existingAttempt = await tx.attempt.findFirst({
      where: {
        userId: user.id,
        examId,
        status: "IN_PROGRESS",
      },
      include: attemptReviewInclude,
    });

    if (existingAttempt) {
      const deadline = getAttemptDeadline(existingAttempt);
      if (!deadline || Date.now() <= deadline.getTime()) {
        return buildAttemptResponse(existingAttempt, false);
      }
      await tx.attempt.delete({ where: { id: existingAttempt.id } });
    }

    if (exam.type === "FULL_LENGTH") {
      const completedAttempt = await tx.attempt.findFirst({
        where: {
          userId: user.id,
          examId,
          status: { in: ["SUBMITTED", "REVIEWED"] },
        },
        orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
        select: { id: true },
      });

      if (completedAttempt) {
        throw new ApiError(409, "Full length exams can only be completed once.", {
          attemptId: completedAttempt.id,
        });
      }
    }

    return tx.attempt.create({
      data: {
        userId: user.id,
        examId,
      },
    });
  });
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
  assertAttemptAcceptsAnswers(attempt);

  const question = getActiveSections(attempt.exam.sections)
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

async function updateSkillStats(userId, questionResults, db = prisma) {
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
      const existing = await db.skillStat.findUnique({
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

      return db.skillStat.upsert({
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
  const result = await runSerializableTransaction(async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: attemptReviewInclude,
    });

    if (!attempt || attempt.userId !== userId) {
      throw new ApiError(404, "Attempt not found.");
    }

    if (attempt.status !== "IN_PROGRESS") {
      return { updatedAttempt: attempt, previousBestAttempt: null, didSubmit: false };
    }

    const answersByQuestionId = new Map(
      attempt.answers.map((answer) => [answer.questionId, answer])
    );
    const questionResults = getActiveSections(attempt.exam.sections).flatMap((section) =>
      section.questions.map((question) => {
        const savedAnswer = answersByQuestionId.get(question.id);
        return {
          sectionId: section.id,
          question,
          savedAnswer,
          isCorrect: evaluateAnswer(question, savedAnswer?.answer),
        };
      })
    );
    const scoreSummary = buildScoreSummary(attempt.exam, questionResults);
    const previousBestAttempt = await tx.attempt.findFirst({
      where: {
        userId,
        status: { in: ["SUBMITTED", "REVIEWED"] },
      },
      orderBy: { totalScore: "desc" },
      select: { totalScore: true },
    });

    await Promise.all(
      questionResults
        .filter((item) => item.savedAnswer)
        .map((item) =>
          tx.userAnswer.update({
            where: { id: item.savedAnswer.id },
            data: { isCorrect: item.isCorrect },
          })
        )
    );

    const submittedAt = new Date();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    );
    const deadline = getAttemptDeadline(attempt);
    const maximumRecordedSeconds = deadline
      ? Math.max(1, Math.floor((deadline.getTime() - new Date(attempt.startedAt).getTime()) / 1000))
      : elapsedSeconds;
    const transition = await tx.attempt.updateMany({
      where: { id: attemptId, userId, status: "IN_PROGRESS" },
      data: {
        status: "SUBMITTED",
        submittedAt,
        timeSpent: Math.min(elapsedSeconds, maximumRecordedSeconds),
        totalScore: scoreSummary.totalScore,
        readingWritingScore: scoreSummary.readingWritingScore,
        mathScore: scoreSummary.mathScore,
        listeningScore: scoreSummary.listeningScore,
      },
    });

    if (transition.count !== 1) {
      const currentAttempt = await tx.attempt.findUnique({
        where: { id: attemptId },
        include: attemptReviewInclude,
      });
      return { updatedAttempt: currentAttempt, previousBestAttempt: null, didSubmit: false };
    }

    await updateSkillStats(userId, questionResults, tx);
    const updatedAttempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: attemptReviewInclude,
    });
    return { updatedAttempt, previousBestAttempt, didSubmit: true };
  });

  const { updatedAttempt, previousBestAttempt, didSubmit } = result;
  if (!updatedAttempt) {
    throw new ApiError(404, "Attempt not found.");
  }

  if (didSubmit) {
    const sideEffects = [
      createNotification({
        userId,
        type: "TEST_SUBMITTED",
        title: "Test submitted",
        message: `${updatedAttempt.exam.title} was submitted with a ${updatedAttempt.totalScore || 0} score.`,
        metadata: { attemptId: updatedAttempt.id, examId: updatedAttempt.examId },
      }),
      evaluateAchievementsForUser(userId, updatedAttempt),
    ];

    if (
      previousBestAttempt?.totalScore
      && (updatedAttempt.totalScore || 0) > previousBestAttempt.totalScore
    ) {
      sideEffects.push(createNotification({
        userId,
        type: "SCORE_IMPROVED",
        title: "New best score",
        message: `You improved from ${previousBestAttempt.totalScore} to ${updatedAttempt.totalScore}.`,
        metadata: {
          attemptId: updatedAttempt.id,
          previousBest: previousBestAttempt.totalScore,
          newBest: updatedAttempt.totalScore,
        },
      }));
    }

    const sideEffectResults = await Promise.allSettled(sideEffects);
    sideEffectResults
      .filter((entry) => entry.status === "rejected")
      .forEach((entry) => console.warn(
        "Post-submit side effect failed:",
        entry.reason?.message || "Unknown side-effect error"
      ));
  }

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

  return attempts
    .filter((attempt) => {
      if (attempt.status !== "IN_PROGRESS") return true;
      const durationMinutes = Math.max(0, Number(attempt.exam?.totalDuration) || 0);
      if (!durationMinutes) return true;
      const expiresAt = new Date(attempt.startedAt).getTime()
        + (durationMinutes + env.examSubmissionGraceMinutes) * 60 * 1000;
      return Date.now() <= expiresAt;
    })
    .map((attempt) => ({
    id: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    examType: attempt.exam.type,
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
  const questionAnalysis = getActiveSections(attemptResponse.exam.sections).flatMap((section) =>
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
    getActiveSections(attemptResponse.exam.sections).flatMap((section) =>
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
  const deadline = getAttemptDeadline(attempt);

  return {
    id: attempt.id,
    userId: attempt.userId,
    examId: attempt.examId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: deadline?.toISOString() || null,
    serverNow: new Date().toISOString(),
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
