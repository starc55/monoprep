import { Router } from 'express';
import { login, me, register, updateMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../utils/validation.schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.put('/me', requireAuth, asyncHandler(updateMe));

export default router;
