import { Router } from 'express';
import {
  getArena,
  getBlitzSession,
  getCompetitionOverview,
  joinArena,
  startBlitz,
  submitArena,
  submitBlitz
} from '../controllers/competition.controller.js';
import { requireAuth, requireStudent } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { blitzStartSchema, blitzSubmitSchema } from '../utils/validation.schemas.js';

const router = Router();

router.use(requireAuth, requireStudent);
router.get('/', asyncHandler(getCompetitionOverview));
router.post('/blitz', validate(blitzStartSchema), asyncHandler(startBlitz));
router.get('/blitz/:id', asyncHandler(getBlitzSession));
router.post('/blitz/:id/submit', validate(blitzSubmitSchema), asyncHandler(submitBlitz));
router.post('/arena', validate(blitzStartSchema), asyncHandler(joinArena));
router.get('/arena/:id', asyncHandler(getArena));
router.post('/arena/:id/submit', validate(blitzSubmitSchema), asyncHandler(submitArena));

export default router;
