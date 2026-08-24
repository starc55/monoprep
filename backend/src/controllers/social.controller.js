import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { createNotification } from '../services/notification.service.js';
import { calculateGamification, toSatScore } from '../services/gamification.service.js';

function maskEmail(email = '') {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '';
  return `${name.slice(0, 2)}***@${domain}`;
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getAccuracy(skillStats = []) {
  const seen = skillStats.reduce((sum, item) => sum + item.questionsSeen, 0);
  const correct = skillStats.reduce((sum, item) => sum + item.questionsCorrect, 0);
  return seen ? Math.round((correct / seen) * 100) : 0;
}

function getPublicStats(user) {
  const submittedAttempts = (user.attempts || []).filter((attempt) => attempt.status !== 'IN_PROGRESS');
  const scores = submittedAttempts.map((attempt) => toSatScore(attempt.totalScore));
  const gamification = calculateGamification({
    attempts: submittedAttempts,
    blitzSessions: user.blitzSessions || []
  });
  return {
    bestScore: gamification.bestScore,
    averageScore: average(scores),
    currentScore: scores.at(-1) || 0,
    completedExams: submittedAttempts.length,
    completedBlitz: gamification.completedBlitz,
    xp: gamification.xp,
    level: gamification.level,
    league: gamification.league,
    leagueScore: gamification.leagueScore,
    accuracy: getAccuracy(user.skillStats || []),
    followersCount: user._count?.followers || 0,
    followingCount: user._count?.following || 0
  };
}

function toStudentCard(user, rankMap, followingIds = new Set()) {
  const stats = getPublicStats(user);
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    emailPreview: maskEmail(user.email),
    rank: rankMap.get(user.id) || null,
    isFollowing: followingIds.has(user.id),
    ...stats
  };
}

async function getRankMap() {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      attempts: {
        where: { status: { in: ['SUBMITTED', 'REVIEWED'] } },
        select: { totalScore: true, status: true, exam: { select: { type: true } } }
      },
      blitzSessions: { where: { status: 'SUBMITTED' }, select: { status: true, xpEarned: true } }
    }
  });

  return new Map(
    users
      .map((user) => ({
        id: user.id,
        score: calculateGamification({ attempts: user.attempts, blitzSessions: user.blitzSessions }).leagueScore
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => [entry.id, index + 1])
  );
}

export async function listStudents(req, res) {
  const search = String(req.query.search || '').trim();
  const sort = String(req.query.sort || 'rank');
  const rankMap = await getRankMap();
  const following = await prisma.follow.findMany({
    where: { followerId: req.user.id },
    select: { followingId: true }
  });
  const followingIds = new Set(following.map((item) => item.followingId));

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    include: {
      attempts: {
        where: { status: { in: ['SUBMITTED', 'REVIEWED'] } },
        orderBy: { submittedAt: 'asc' },
        select: { totalScore: true, status: true, submittedAt: true, startedAt: true, exam: { select: { type: true } } }
      },
      blitzSessions: {
        where: { status: 'SUBMITTED' },
        select: { status: true, xpEarned: true }
      },
      skillStats: true,
      _count: {
        select: { followers: true, following: true }
      }
    }
  });

  const rows = students
    .map((user) => toStudentCard(user, rankMap, followingIds))
    .sort((a, b) => {
      if (sort === 'score') return b.leagueScore - a.leagueScore;
      if (sort === 'activity') return b.completedExams - a.completedExams;
      if (sort === 'followers') return b.followersCount - a.followersCount;
      return (a.rank || 999999) - (b.rank || 999999);
    });

  res.json({ students: rows });
}

export async function getStudentProfile(req, res) {
  const rankMap = await getRankMap();
  const [student, followStatus] = await Promise.all([
    prisma.user.findFirst({
      where: { id: req.params.id, role: 'STUDENT' },
      include: {
        attempts: {
          where: { status: { in: ['SUBMITTED', 'REVIEWED'] } },
          orderBy: { submittedAt: 'asc' },
          include: {
            exam: { select: { title: true, type: true } }
          }
        },
        blitzSessions: {
          where: { status: 'SUBMITTED' },
          select: { status: true, xpEarned: true }
        },
        skillStats: true,
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' }
        },
        _count: {
          select: { followers: true, following: true }
        }
      }
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: req.params.id
        }
      }
    })
  ]);

  if (!student) {
    throw new ApiError(404, 'Student not found.');
  }

  const publicStats = getPublicStats(student);
  const scoreHistory = student.attempts.map((attempt, index) => ({
    attempt: index + 1,
    date: attempt.submittedAt || attempt.startedAt,
    examTitle: attempt.exam.title,
    totalScore: attempt.totalScore || 0,
    readingWritingScore: attempt.readingWritingScore || 0,
    mathScore: attempt.mathScore || 0
  }));

  res.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      username: student.username,
      avatarUrl: student.avatarUrl,
      emailPreview: maskEmail(student.email),
      rank: rankMap.get(student.id) || null,
      isFollowing: Boolean(followStatus),
      ...publicStats,
      achievements: student.achievements.map((item) => ({
        id: item.id,
        unlockedAt: item.unlockedAt,
        code: item.achievement.code,
        title: item.achievement.title,
        description: item.achievement.description,
        icon: item.achievement.icon
      })),
      recentAttempts: student.attempts.slice(-8).reverse().map((attempt) => ({
        id: attempt.id,
        examTitle: attempt.exam.title,
        examType: attempt.exam.type,
        submittedAt: attempt.submittedAt,
        totalScore: attempt.totalScore,
        readingWritingScore: attempt.readingWritingScore,
        mathScore: attempt.mathScore,
        timeSpent: attempt.timeSpent
      })),
      scoreHistory,
      skillBreakdown: student.skillStats.map((item) => ({
        skill: item.skill,
        accuracy: item.accuracy,
        questionsSeen: item.questionsSeen
      }))
    }
  });
}

export async function followStudent(req, res) {
  const followingId = req.params.userId;
  if (followingId === req.user.id) {
    throw new ApiError(400, 'You cannot follow yourself.');
  }

  const target = await prisma.user.findFirst({
    where: { id: followingId, role: 'STUDENT' },
    select: { id: true, fullName: true }
  });
  if (!target) {
    throw new ApiError(404, 'Student not found.');
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: req.user.id,
        followingId
      }
    }
  });

  const follow =
    existingFollow ||
    (await prisma.follow.create({
      data: {
        followerId: req.user.id,
        followingId
      }
    }));

  if (!existingFollow) {
    await createNotification({
      userId: followingId,
      type: 'FOLLOW',
      title: 'New follower',
      message: `${req.user.fullName} started following your progress.`,
      metadata: { followerId: req.user.id }
    });
  }

  res.status(201).json({ follow });
}

export async function unfollowStudent(req, res) {
  await prisma.follow.deleteMany({
    where: {
      followerId: req.user.id,
      followingId: req.params.userId
    }
  });

  res.json({ message: 'Unfollowed successfully.' });
}

export async function getFollowStatus(req, res) {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    }
  });

  res.json({ isFollowing: Boolean(follow) });
}

async function listFollowUsers(userId, mode) {
  const rows = await prisma.follow.findMany({
    where: mode === 'followers' ? { followingId: userId } : { followerId: userId },
    include: {
      [mode === 'followers' ? 'follower' : 'following']: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return rows.map((row) => row[mode === 'followers' ? 'follower' : 'following']);
}

export async function getFollowers(req, res) {
  res.json({ followers: await listFollowUsers(req.params.userId, 'followers') });
}

export async function getFollowing(req, res) {
  res.json({ following: await listFollowUsers(req.params.userId, 'following') });
}
