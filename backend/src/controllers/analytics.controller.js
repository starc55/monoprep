import { getAdminAnalytics, getLeaderboard, getStudentAnalytics } from '../services/analytics.service.js';

export async function getMyAnalytics(req, res) {
  const analytics = await getStudentAnalytics(req.user.id);
  res.json({ analytics });
}

export async function getAdminAnalyticsController(req, res) {
  const analytics = await getAdminAnalytics();
  res.json({ analytics });
}

export async function getLeaderboardController(req, res) {
  const leaderboard = await getLeaderboard(req.user.id);
  res.json({ leaderboard });
}
