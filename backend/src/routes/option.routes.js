import { Router } from 'express';
import { createOption, deleteOption } from '../controllers/option.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { optionSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.post('/', validate(optionSchema), asyncHandler(createOption));
router.delete('/:id', asyncHandler(deleteOption));

export default router;
