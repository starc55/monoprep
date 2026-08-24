const leagueThresholds = [
  ['Legend', 1550],
  ['Master', 1450],
  ['Diamond', 1300],
  ['Platinum', 1100],
  ['Gold', 900],
  ['Silver', 700],
  ['Bronze', 0]
];

export function toSatScore(value) {
  const score = Number(value) || 0;
  return score <= 100 ? Math.round(400 + (score / 100) * 1200) : score;
}

export function calculateGamification({ attempts = [], blitzSessions = [] } = {}) {
  const submittedAttempts = attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
  const completedBlitz = blitzSessions.filter((session) => session.status === 'SUBMITTED');
  const bestScore = Math.max(0, ...submittedAttempts.map((attempt) => toSatScore(attempt.totalScore)));
  const examXp = submittedAttempts.reduce((total, attempt) => {
    const base = attempt.exam?.type === 'FULL_LENGTH' ? 240 : 120;
    return total + base + Math.round(toSatScore(attempt.totalScore) / 20);
  }, 0);
  const blitzXp = completedBlitz.reduce((total, session) => total + (session.xpEarned || 0), 0);
  const xp = examXp + blitzXp;
  const activityBase = submittedAttempts.length || completedBlitz.length ? Math.max(400, bestScore) : 0;
  const leagueScore = Math.min(1600, activityBase + Math.min(200, Math.floor(blitzXp / 10)));
  const league = leagueThresholds.find(([, threshold]) => leagueScore >= threshold)?.[0] || 'Bronze';

  return {
    xp,
    level: Math.max(1, Math.min(99, Math.floor(Math.sqrt(xp / 80)) + 1)),
    league,
    leagueScore,
    bestScore,
    examXp,
    blitzXp,
    completedExams: submittedAttempts.length,
    completedBlitz: completedBlitz.length
  };
}
