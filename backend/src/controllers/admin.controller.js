import { prisma } from '../config/prisma.js';
import { getAdminAnalytics } from '../services/analytics.service.js';
import { listAllAttemptsForAdmin } from '../services/attempt.service.js';

export async function getUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      attempts: {
        select: {
          id: true,
          status: true,
          totalScore: true,
          startedAt: true,
          submittedAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ users });
}

export async function getStats(req, res) {
  const stats = await getAdminAnalytics();
  res.json({ stats });
}

export async function getAttempts(req, res) {
  const attempts = await listAllAttemptsForAdmin();
  res.json({ attempts });
}
