import { Router } from 'express';
import {
  getNotifications,
  readAllNotifications,
  readNotification
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(getNotifications));
router.patch('/read-all', asyncHandler(readAllNotifications));
router.patch('/:id/read', asyncHandler(readNotification));

export default router;
