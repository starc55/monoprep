import { Router } from 'express';
import { me, updateMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { updateProfileSchema } from '../utils/validation.schemas.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(me));
router.put('/me', requireAuth, validate(updateProfileSchema), asyncHandler(updateMe));

export default router;
