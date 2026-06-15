import { Router } from 'express';
import {
  getAdminAnalyticsController,
  getLeaderboardController,
  getMyAnalytics
} from '../controllers/analytics.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/me', asyncHandler(getMyAnalytics));
router.get('/leaderboard', asyncHandler(getLeaderboardController));
router.get('/admin', requireAdmin, asyncHandler(getAdminAnalyticsController));

export default router;
