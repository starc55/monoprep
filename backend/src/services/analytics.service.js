import { prisma } from '../config/prisma.js';

function average(values) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function getStudentAnalytics(userId) {
  const attempts = await prisma.attempt.findMany({
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
  });

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
        attempts.at(-1)?.aiFeedback?.feedback?.recommendedPractice || weakTopics.map((item) => item.skill)
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
  const [usersCount, examsCount, attempts, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.exam.count(),
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
    }))
  };
}

export async function getLeaderboard(userId) {
  const attempts = await prisma.attempt.findMany({
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
  });

  const bestByUser = new Map();
  attempts.forEach((attempt) => {
    const score = attempt.totalScore || 0;
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

  const rows = [...bestByUser.values()]
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
