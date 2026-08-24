import { prisma } from '../config/prisma.js';
import { supabaseAuth } from '../config/supabase.js';

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim() || null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const {
      data: { user: authUser },
      error: authError
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    const user = await prisma.user.findUnique({
      where: { authUserId: authUser.id },
      select: {
        id: true,
        authUserId: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        role: true,
        status: true,
        premiumUntil: true,
        teacherProfile: {
          select: {
            id: true,
            status: true,
            subject: true
          }
        }
      }
    });

    if (!user) {
      return res.status(403).json({
        message: 'Your MonoPrep profile is not linked to this Supabase account.',
        code: 'PROFILE_MIGRATION_REQUIRED'
      });
    }

    if (['SUSPENDED', 'REJECTED'].includes(user.status)) {
      return res.status(403).json({
        message: user.status === 'SUSPENDED'
          ? 'This account has been suspended.'
          : 'This account is not approved.',
        code: 'ACCOUNT_ACCESS_BLOCKED',
        status: user.status
      });
    }

    req.user = user;
    req.authUser = authUser;
    req.accessToken = token;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

export function requireTeacher(req, res, next) {
  if (req.user?.role !== 'TEACHER' || req.user?.status === 'SUSPENDED') {
    return res.status(403).json({ message: 'Teacher access required.' });
  }

  next();
}

export function requireStudent(req, res, next) {
  if (req.user?.role !== 'STUDENT' || req.user?.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Student access required.' });
  }

  next();
}

export function requireApprovedTeacher(req, res, next) {
  if (req.user?.role !== 'TEACHER' || req.user?.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Teacher access required.' });
  }

  if (req.user?.teacherProfile?.status !== 'APPROVED') {
    return res.status(403).json({
      message: 'Teacher approval is required before accessing the dashboard.',
      code: 'TEACHER_APPROVAL_REQUIRED',
      status: req.user?.teacherProfile?.status || 'PENDING'
    });
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN' || req.user?.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  next();
}

export function requireExamManager(req, res, next) {
  const isActiveAdmin =
    req.user?.role === 'ADMIN' && req.user?.status === 'ACTIVE';
  const isApprovedTeacher =
    req.user?.role === 'TEACHER' &&
    req.user?.status === 'ACTIVE' &&
    req.user?.teacherProfile?.status === 'APPROVED';

  if (!isActiveAdmin && !isApprovedTeacher) {
    return res.status(403).json({
      message: 'Approved teacher or admin access required.'
    });
  }

  next();
}
