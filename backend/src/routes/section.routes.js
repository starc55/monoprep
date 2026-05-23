import { Router } from 'express';
import {
  createSection,
  deleteSection,
  updateSection
} from '../controllers/section.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sectionSchema, sectionUpdateSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.post('/', validate(sectionSchema), asyncHandler(createSection));
router.put('/:id', validate(sectionUpdateSchema), asyncHandler(updateSection));
router.delete('/:id', asyncHandler(deleteSection));

export default router;
