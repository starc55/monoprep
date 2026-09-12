import { Router } from 'express';
import {
  commitPdfImportDraft,
  createPdfImportUploadUrl,
  generateFeedback,
  getFeedback,
  previewPdfImport,
  previewStoredPdfImport,
  testOpenAI
} from '../controllers/ai.controller.js';
import { requireAuth, requireExamManager } from '../middleware/auth.middleware.js';
import { receivePdfImport } from '../middleware/pdfImport.middleware.js';
import { aiLimiter, uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  pdfImportCommitSchema,
  pdfImportStoragePreviewSchema,
  pdfImportUploadUrlSchema
} from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.post('/test', requireExamManager, aiLimiter, asyncHandler(testOpenAI));
router.post(
  '/pdf-import/upload-url',
  requireExamManager,
  uploadLimiter,
  validate(pdfImportUploadUrlSchema),
  asyncHandler(createPdfImportUploadUrl)
);
router.post(
  '/pdf-import/preview-storage',
  requireExamManager,
  uploadLimiter,
  aiLimiter,
  validate(pdfImportStoragePreviewSchema),
  asyncHandler(previewStoredPdfImport)
);
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
