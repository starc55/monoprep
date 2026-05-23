import { Router } from 'express';
import {
  createPassage,
  deletePassage,
  listPassages,
  updatePassage
} from '../controllers/passage.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { passageSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/', asyncHandler(listPassages));
router.post('/', validate(passageSchema), asyncHandler(createPassage));
router.put('/:id', validate(passageSchema.partial()), asyncHandler(updatePassage));
router.delete('/:id', asyncHandler(deletePassage));

export default router;
