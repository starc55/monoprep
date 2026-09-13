import { Router } from 'express';
import { createQuestionReport, createSupportMessage } from '../controllers/support.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { supportLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { questionReportSchema, supportMessageSchema } from '../utils/validation.schemas.js';

const router = Router();

router.post('/', supportLimiter, requireAuth, validate(supportMessageSchema), asyncHandler(createSupportMessage));
router.post('/question-report', supportLimiter, requireAuth, validate(questionReportSchema), asyncHandler(createQuestionReport));

export default router;
