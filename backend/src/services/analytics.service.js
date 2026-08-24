import { prisma } from '../config/prisma.js';
import { calculateGamification, toSatScore } from './gamification.service.js';

function average(values) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function getStudentAnalytics(userId) {
  const [attempts, blitzSessions] = await Promise.all([prisma.attempt.findMany({
    where: {
      userId,
      status: {
        in: ['SUBMITTED', 'REVIEWED']
      }
    },
    include: {
      exam: {
        include: {
          sections: {
            include: {
              questions: true
            }
          }
        }
      },
      answers: {
        include: {
          question: {
            include: {
              section: true
            }
          }
        }
      },
      aiFeedback: true
    },
    orderBy: { startedAt: 'asc' }
  }), prisma.blitzSession.findMany({
    where: { userId, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'asc' }
  })]);
  const gamification = calculateGamification({ attempts, blitzSessions });

  const scoreHistory = attempts.map((attempt) => ({
    attemptId: attempt.id,
    examTitle: attempt.exam.title,
    date: attempt.submittedAt || attempt.startedAt,
    totalScore: attempt.totalScore || 0,
    readingWritingScore: attempt.readingWritingScore || 0,
    mathScore: attempt.mathScore || 0,
    listeningScore: attempt.listeningScore || 0
  }));

  const skillTotals = new Map();
  const sectionTimeMap = new Map();

  attempts.forEach((attempt) => {
    const sectionCount = attempt.exam.sections.length || 1;
    const derivedSectionTime = Math.round((attempt.timeSpent || 0) / sectionCount);

    attempt.answers.forEach((answer) => {
      const current = skillTotals.get(answer.question.skill) || {
        skill: answer.question.skill,
        total: 0,
        correct: 0
      };

      current.total += 1;
      if (answer.isCorrect) {
        current.correct += 1;
      }
      skillTotals.set(answer.question.skill, current);

      const sectionKey = answer.question.section.title;
      const sectionData = sectionTimeMap.get(sectionKey) || {
        section: sectionKey,
        seconds: 0
      };
      sectionData.seconds += answer.timeSpent || derivedSectionTime;
      sectionTimeMap.set(sectionKey, sectionData);
    });
  });

  const accuracyBySkill = [...skillTotals.values()].map((entry) => ({
    skill: entry.skill,
    accuracy: Math.round((entry.correct / entry.total) * 100),
    totalQuestions: entry.total
  }));

  const weakTopics = accuracyBySkill
    .filter((entry) => entry.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  return {
    overview: {
      attemptsTaken: attempts.length,
      averageScore: average(attempts.map((attempt) => attempt.totalScore || 0)),
      bestScore: Math.max(0, ...attempts.map((attempt) => attempt.totalScore || 0)),
      weakSkills: weakTopics.map((item) => item.skill),
      recommendedPractice:
        attempts.at(-1)?.aiFeedback?.feedback?.recommendedPractice || weakTopics.map((item) => item.skill),
      gamification
    },
    scoreHistory,
    accuracyBySkill,
    timePerSection: [...sectionTimeMap.values()],
    weakTopics,
    improvementTrend:
      scoreHistory.length >= 2
        ? scoreHistory[scoreHistory.length - 1].totalScore - scoreHistory[0].totalScore
        : 0
  };
}

export async function getAdminAnalytics() {
  const [usersCount, examsCount, publishedExamsCount, questionCount, attempts, recentUsers, recentExams] = await Promise.all([
    prisma.user.count(),
    prisma.exam.count(),
    prisma.exam.count({ where: { isPublished: true } }),
    prisma.question.count(),
    prisma.attempt.findMany({
      include: {
        exam: true,
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        accessType: true,
        isPublished: true,
        createdAt: true
      }
    })
  ]);

  const submittedAttempts = attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
  const averageScore =
    submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce((sum, attempt) => sum + (attempt.totalScore || 0), 0) /
            submittedAttempts.length
        )
      : 0;

  return {
    totals: {
      usersCount,
      examsCount,
      publishedExamsCount,
      questionCount,
      attemptsCount: attempts.length,
      submittedAttemptsCount: submittedAttempts.length,
      averageScore
    },
    recentUsers,
    recentAttempts: attempts.slice(0, 10).map((attempt) => ({
      id: attempt.id,
      examTitle: attempt.exam.title,
      student: attempt.user.fullName,
      email: attempt.user.email,
      status: attempt.status,
      totalScore: attempt.totalScore,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt
    })),
    recentExams,
    attemptsOverTime: getDailyAttemptSeries(submittedAttempts),
    scoreDistribution: getScoreDistribution(submittedAttempts)
  };
}

function getDailyAttemptSeries(attempts) {
  const days = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      attempts: 0
    };
  });
  const dayMap = new Map(days.map((day) => [day.key, day]));

  attempts.forEach((attempt) => {
    const key = new Date(attempt.submittedAt || attempt.startedAt).toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (row) {
      row.attempts += 1;
    }
  });

  return days;
}

function getScoreDistribution(attempts) {
  const buckets = [
    { label: '400-799', min: 400, max: 799, students: 0 },
    { label: '800-999', min: 800, max: 999, students: 0 },
    { label: '1000-1199', min: 1000, max: 1199, students: 0 },
    { label: '1200-1399', min: 1200, max: 1399, students: 0 },
    { label: '1400-1600', min: 1400, max: 1600, students: 0 }
  ];

  attempts.forEach((attempt) => {
    const score = toSatScore(attempt.totalScore);
    const bucket = buckets.find((item) => score >= item.min && score <= item.max);
    if (bucket) {
      bucket.students += 1;
    }
  });

  return buckets.map(({ label, students }) => ({ label, students }));
}

export async function getLeaderboard(userId) {
  const [attempts, blitzSessions] = await Promise.all([prisma.attempt.findMany({
    where: {
      status: {
        in: ['SUBMITTED', 'REVIEWED']
      }
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true
        }
      },
      exam: {
        select: {
          title: true,
          type: true
        }
      }
    },
    orderBy: [{ totalScore: 'desc' }, { submittedAt: 'asc' }]
  }), prisma.blitzSession.findMany({
    where: { status: 'SUBMITTED' },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, avatarUrl: true }
      }
    },
    orderBy: { submittedAt: 'asc' }
  })]);

  const bestByUser = new Map();
  attempts.forEach((attempt) => {
    const score = calculateGamification({ attempts: [attempt] }).bestScore;
    const current = bestByUser.get(attempt.userId);
    if (!current || score > current.score) {
      bestByUser.set(attempt.userId, {
        userId: attempt.userId,
        name: attempt.user.username ? `@${attempt.user.username}` : attempt.user.fullName,
        avatarUrl: attempt.user.avatarUrl,
        score,
        readingWritingScore: attempt.readingWritingScore || 0,
        mathScore: attempt.mathScore || 0,
        examTitle: attempt.exam.title,
        examType: attempt.exam.type,
        submittedAt: attempt.submittedAt || attempt.startedAt
      });
    }
  });

  blitzSessions.forEach((session) => {
    if (bestByUser.has(session.userId)) return;
    bestByUser.set(session.userId, {
      userId: session.userId,
      name: session.user.username ? `@${session.user.username}` : session.user.fullName,
      avatarUrl: session.user.avatarUrl,
      score: 0,
      readingWritingScore: 0,
      mathScore: 0,
      examTitle: 'Blitz Arena',
      examType: 'BLITZ',
      submittedAt: session.submittedAt || session.startedAt
    });
  });

  const blitzByUser = new Map();
  blitzSessions.forEach((session) => {
    const rows = blitzByUser.get(session.userId) || [];
    rows.push(session);
    blitzByUser.set(session.userId, rows);
  });
  const attemptsByUser = new Map();
  attempts.forEach((attempt) => {
    const rows = attemptsByUser.get(attempt.userId) || [];
    rows.push(attempt);
    attemptsByUser.set(attempt.userId, rows);
  });

  const rows = [...bestByUser.values()].map((row) => {
    const userAttempts = attemptsByUser.get(row.userId) || [];
    const userBlitz = blitzByUser.get(row.userId) || [];
    const gamification = calculateGamification({
      attempts: userAttempts,
      blitzSessions: userBlitz
    });
    const activityDates = [
      ...userAttempts.map((attempt) => attempt.submittedAt || attempt.startedAt),
      ...userBlitz.map((session) => session.submittedAt || session.startedAt)
    ].filter(Boolean).map((value) => new Date(value).getTime());
    return {
      ...row,
      submittedAt: activityDates.length ? new Date(Math.max(...activityDates)) : row.submittedAt,
      score: gamification.leagueScore,
      ...gamification
    };
  })
    .sort((a, b) => b.score - a.score || new Date(a.submittedAt) - new Date(b.submittedAt))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      isCurrentUser: row.userId === userId
    }));

  return {
    participants: rows.length,
    top: rows.slice(0, 10),
    currentUser: rows.find((row) => row.userId === userId) || null
  };
}
