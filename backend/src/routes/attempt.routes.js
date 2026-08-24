import { Router } from 'express';
import {
  answerAttempt,
  getAttempt,
  getMyAttempts,
  startAttempt,
  submitAttemptController
} from '../controllers/attempt.controller.js';
import { requireAuth, requireStudent } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { answerSchema, startAttemptSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.post('/start', requireStudent, validate(startAttemptSchema), asyncHandler(startAttempt));
router.post('/:id/answer', requireStudent, validate(answerSchema), asyncHandler(answerAttempt));
router.post('/:id/submit', requireStudent, asyncHandler(submitAttemptController));
router.get('/me', requireStudent, asyncHandler(getMyAttempts));
router.get('/user/me', requireStudent, asyncHandler(getMyAttempts));
router.get('/:id', asyncHandler(getAttempt));

export default router;
