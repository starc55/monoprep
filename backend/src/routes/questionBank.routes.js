import { Router } from 'express';
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  listQuestionBankItems,
  listQuestionHubProgress,
  upsertQuestionHubProgress,
  updateQuestionBankItem
} from '../controllers/questionBank.controller.js';
import { requireAdmin, requireAuth, requireExamManager } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  questionBankItemSchema,
  questionBankItemUpdateSchema,
  questionHubProgressSchema
} from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/progress', asyncHandler(listQuestionHubProgress));
router.put('/progress', validate(questionHubProgressSchema), asyncHandler(upsertQuestionHubProgress));
router.get('/', asyncHandler(listQuestionBankItems));
router.post('/', requireExamManager, validate(questionBankItemSchema), asyncHandler(createQuestionBankItem));
router.put('/:id', requireExamManager, validate(questionBankItemUpdateSchema), asyncHandler(updateQuestionBankItem));
router.delete('/:id', requireAdmin, asyncHandler(deleteQuestionBankItem));

export default router;
