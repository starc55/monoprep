import { Router } from 'express';
import {
  followStudent,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getStudentProfile,
  listStudents,
  unfollowStudent
} from '../controllers/social.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/students', asyncHandler(listStudents));
router.get('/students/:id', asyncHandler(getStudentProfile));
router.post('/follow/:userId', asyncHandler(followStudent));
router.delete('/follow/:userId', asyncHandler(unfollowStudent));
router.get('/follow-status/:userId', asyncHandler(getFollowStatus));
router.get('/followers/:userId', asyncHandler(getFollowers));
router.get('/following/:userId', asyncHandler(getFollowing));

export default router;
