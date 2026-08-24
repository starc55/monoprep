import { Router } from 'express';
import {
  createTeacher,
  getStats,
  getTeachers,
  getUsers,
  updateUserPremiumAccess,
  updateTeacherStatus
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/users', asyncHandler(getUsers));
router.patch('/users/:id/premium', asyncHandler(updateUserPremiumAccess));
router.get('/stats', asyncHandler(getStats));
router.get('/teachers', asyncHandler(getTeachers));
router.post('/teachers', asyncHandler(createTeacher));
router.patch('/teachers/:id/status', asyncHandler(updateTeacherStatus));

export default router;
