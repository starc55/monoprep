import { Router } from 'express';
import { generateFeedback, getFeedback, previewPdfImport, testOpenAI } from '../controllers/ai.controller.js';
import { requireAuth, requireExamManager } from '../middleware/auth.middleware.js';
import { receivePdfImport } from '../middleware/pdfImport.middleware.js';
import { aiLimiter, uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
router.post('/feedback/:attemptId', aiLimiter, asyncHandler(generateFeedback));
router.get('/feedback/:attemptId', asyncHandler(getFeedback));

export default router;
