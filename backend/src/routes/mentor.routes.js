import { Router } from 'express';
import {
  createMentor,
  deleteMentor,
  listMentors,
  updateMentor
} from '../controllers/mentor.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mentorSchema, mentorUpdateSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(listMentors));
router.post('/', requireAdmin, validate(mentorSchema), asyncHandler(createMentor));
router.put('/:id', requireAdmin, validate(mentorUpdateSchema), asyncHandler(updateMentor));
router.delete('/:id', requireAdmin, asyncHandler(deleteMentor));

export default router;
