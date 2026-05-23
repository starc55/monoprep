import { Router } from 'express';
import { createSupportMessage } from '../controllers/support.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { supportMessageSchema } from '../utils/validation.schemas.js';

const router = Router();

router.post('/', requireAuth, validate(supportMessageSchema), asyncHandler(createSupportMessage));

export default router;
