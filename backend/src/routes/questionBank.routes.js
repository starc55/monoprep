import { Router } from 'express';
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  listQuestionBankItems,
  updateQuestionBankItem
} from '../controllers/questionBank.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  questionBankItemSchema,
  questionBankItemUpdateSchema
} from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(listQuestionBankItems));
router.post('/', requireAdmin, validate(questionBankItemSchema), asyncHandler(createQuestionBankItem));
router.put('/:id', requireAdmin, validate(questionBankItemUpdateSchema), asyncHandler(updateQuestionBankItem));
router.delete('/:id', requireAdmin, asyncHandler(deleteQuestionBankItem));

export default router;
