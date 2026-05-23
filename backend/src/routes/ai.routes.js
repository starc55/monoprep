import { Router } from 'express';
import { generateFeedback, getFeedback } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.post('/feedback/:attemptId', asyncHandler(generateFeedback));
router.get('/feedback/:attemptId', asyncHandler(getFeedback));

export default router;
