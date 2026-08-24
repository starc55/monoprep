import { prisma } from '../config/prisma.js';
import { defaultAchievements } from '../constants/achievements.js';
import { createNotification } from './notification.service.js';

export async function ensureDefaultAchievements() {
  await Promise.all(
    defaultAchievements.map((achievement) =>
      prisma.achievement.upsert({
        where: { code: achievement.code },
        update: {
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          condition: achievement.condition
        },
        create: achievement
      })
    )
  );
}

function shouldUnlock(achievement, stats) {
  switch (achievement.code) {
    case 'FIRST_TEST':
      return stats.completedTests >= 1;
    case 'FIVE_TESTS':
      return stats.completedTests >= 5;
    case 'TEN_TESTS':
      return stats.completedTests >= 10;
    case 'SCORE_1000':
      return stats.bestScore >= 1000;
    case 'SCORE_1200':
      return stats.bestScore >= 1200;
    case 'SCORE_IMPROVED':
      return stats.scoreImproved;
    case 'MATH_MASTER':
      return stats.bestMathScore >= 700;
    case 'READING_CHAMPION':
      return stats.bestReadingWritingScore >= 700;
    case 'SEVEN_DAY_STREAK':
      return stats.studyStreak >= 7;
    default:
      return false;
  }
}

export async function evaluateAchievementsForUser(userId, attempt) {
  await ensureDefaultAchievements();

  const submittedAttempts = await prisma.attempt.findMany({
    where: {
      userId,
      status: { in: ['SUBMITTED', 'REVIEWED'] }
    },
    select: {
      id: true,
      totalScore: true,
      readingWritingScore: true,
      mathScore: true,
      submittedAt: true,
      startedAt: true
    }
  });

  const previousBest = Math.max(
    0,
    ...submittedAttempts
      .filter((item) => item.id !== attempt.id)
      .map((item) => item.totalScore || 0)
  );
  const stats = {
    completedTests: submittedAttempts.length,
    bestScore: Math.max(0, ...submittedAttempts.map((item) => item.totalScore || 0)),
    bestMathScore: Math.max(0, ...submittedAttempts.map((item) => item.mathScore || 0)),
    bestReadingWritingScore: Math.max(0, ...submittedAttempts.map((item) => item.readingWritingScore || 0)),
    scoreImproved: (attempt.totalScore || 0) > previousBest && previousBest > 0,
    studyStreak: 0
  };

  const [achievements, existing] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true }
    })
  ]);
  const unlockedIds = new Set(existing.map((item) => item.achievementId));
  const newlyUnlocked = achievements.filter((achievement) => !unlockedIds.has(achievement.id) && shouldUnlock(achievement, stats));

  await Promise.all(
    newlyUnlocked.map(async (achievement) => {
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      });
      await createNotification({
        userId,
        type: 'ACHIEVEMENT',
        title: 'Achievement unlocked',
        message: `${achievement.title} is now on your profile.`,
        metadata: { achievementCode: achievement.code, attemptId: attempt.id }
      });
    })
  );

  return newlyUnlocked;
}
