export const LEAGUES = [
  { key: 'bronze', name: 'Bronze', minScore: 0 },
  { key: 'silver', name: 'Silver', minScore: 700 },
  { key: 'gold', name: 'Gold', minScore: 900 },
  { key: 'platinum', name: 'Platinum', minScore: 1100 },
  { key: 'diamond', name: 'Diamond', minScore: 1300 },
  { key: 'master', name: 'Master', minScore: 1450 },
  { key: 'legend', name: 'Legend', minScore: 1550 }
];

export function getLeagueFromScore(score = 0) {
  const safeScore = Number(score) || 0;
  return [...LEAGUES].reverse().find((league) => safeScore >= league.minScore) || LEAGUES[0];
}

export function getLevelFromScore(score = 0, completedExams = 0, accuracy = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  const safeCompleted = Math.max(0, Number(completedExams) || 0);
  const safeAccuracy = Math.max(0, Number(accuracy) || 0);
  const scoreLevel = Math.floor(safeScore / 40);
  const activityLevel = Math.min(24, safeCompleted);
  const accuracyLevel = Math.floor(safeAccuracy / 10);
  return Math.max(1, Math.min(99, scoreLevel + activityLevel + accuracyLevel));
}
