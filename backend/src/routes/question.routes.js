import { Router } from 'express';
import {
  createQuestion,
  deleteQuestion,
  listQuestions,
  updateQuestion
} from '../controllers/question.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { questionSchema, questionUpdateSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/', asyncHandler(listQuestions));
router.post('/', validate(questionSchema), asyncHandler(createQuestion));
router.put('/:id', validate(questionUpdateSchema), asyncHandler(updateQuestion));
router.delete('/:id', asyncHandler(deleteQuestion));

export default router;
