import { Router } from 'express';
import {
  createDesmosLesson,
  deleteDesmosLesson,
  listDesmosLessons,
  updateDesmosLesson
} from '../controllers/desmos.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  desmosLessonSchema,
  desmosLessonUpdateSchema
} from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(listDesmosLessons));
router.post('/', requireAdmin, validate(desmosLessonSchema), asyncHandler(createDesmosLesson));
router.patch('/:id', requireAdmin, validate(desmosLessonUpdateSchema), asyncHandler(updateDesmosLesson));
router.delete('/:id', requireAdmin, asyncHandler(deleteDesmosLesson));

export default router;
