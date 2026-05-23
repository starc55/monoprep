import { Router } from 'express';
import {
  createExam,
  deleteExam,
  getExam,
  listExams,
  updateExam
} from '../controllers/exam.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { examSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(listExams));
router.get('/:id', asyncHandler(getExam));
router.post('/', requireAdmin, validate(examSchema), asyncHandler(createExam));
router.put('/:id', requireAdmin, validate(examSchema.partial()), asyncHandler(updateExam));
router.delete('/:id', requireAdmin, asyncHandler(deleteExam));

export default router;
