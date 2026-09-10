import { Router } from 'express';
import { commitPdfImportDraft, generateFeedback, getFeedback, previewPdfImport, testOpenAI } from '../controllers/ai.controller.js';
import { requireAuth, requireExamManager } from '../middleware/auth.middleware.js';
import { receivePdfImport } from '../middleware/pdfImport.middleware.js';
import { aiLimiter, uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.middleware.js';
import { pdfImportCommitSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.post('/test', requireExamManager, aiLimiter, asyncHandler(testOpenAI));
router.post(
  '/pdf-import/preview',
  requireExamManager,
  uploadLimiter,
  aiLimiter,
  receivePdfImport,
  asyncHandler(previewPdfImport)
);
router.post('/pdf-import/commit', requireExamManager, aiLimiter, validate(pdfImportCommitSchema), asyncHandler(commitPdfImportDraft));
router.post('/feedback/:attemptId', aiLimiter, asyncHandler(generateFeedback));
router.get('/feedback/:attemptId', asyncHandler(getFeedback));

export default router;
