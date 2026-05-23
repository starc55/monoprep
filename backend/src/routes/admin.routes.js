import { Router } from 'express';
import { getAttempts, getStats, getUsers } from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/users', asyncHandler(getUsers));
router.get('/stats', asyncHandler(getStats));
router.get('/attempts', asyncHandler(getAttempts));

export default router;
