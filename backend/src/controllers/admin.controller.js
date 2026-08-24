import { prisma } from '../config/prisma.js';
import { requireSupabaseAdminClient } from '../config/supabase.js';
import { getAdminAnalytics } from '../services/analytics.service.js';

export async function getUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      premiumUntil: true,
      createdAt: true,
      updatedAt: true,
      attempts: {
        select: {
          id: true,
          status: true,
          totalScore: true,
          startedAt: true,
          submittedAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    users
  });
}

export async function getStats(req, res) {
  const stats = await getAdminAnalytics();
  res.json({ stats });
}

export async function updateUserPremiumAccess(req, res) {
  const { premiumUntil } = req.body;
  let parsedPremiumUntil = null;

  if (premiumUntil !== null) {
    parsedPremiumUntil = new Date(premiumUntil);
    if (Number.isNaN(parsedPremiumUntil.getTime())) {
      return res.status(400).json({ message: 'premiumUntil must be a valid ISO date or null.' });
    }
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { premiumUntil: parsedPremiumUntil },
    select: {
      id: true,
      fullName: true,
      email: true,
      premiumUntil: true
    }
  });

  res.json({
    user: {
      ...user,
      hasPremiumAccess: Boolean(user.premiumUntil && user.premiumUntil > new Date())
    }
  });
}

export async function getTeachers(req, res) {
  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          avatarUrl: true,
          createdAt: true
        }
      },
      accessRequest: {
        select: {
          status: true,
          requestedAt: true,
          reviewedAt: true,
          rejectionReason: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      fullName: teacher.user.fullName,
      email: teacher.user.email,
      username: teacher.user.username,
      avatarUrl: teacher.user.avatarUrl,
      subject: teacher.subject,
      experience: teacher.experience,
      bio: teacher.bio,
      status: teacher.status,
      contactEnabled: teacher.contactEnabled,
      contactEmail: teacher.contactEmail,
      contactPhone: teacher.contactPhone,
      telegram: teacher.telegram,
      createdAt: teacher.createdAt,
      accessRequest: teacher.accessRequest
    }))
  });
}

export async function createTeacher(req, res) {
  const {
    fullName,
    email,
    username,
    temporaryPassword,
    subject,
    experience,
    bio,
    avatarUrl,
    contactEnabled = false,
    contactEmail,
    contactPhone,
    telegram,
    status = 'PENDING'
  } = req.body;

  if (!fullName || !email || !temporaryPassword || !subject) {
    return res.status(400).json({
      message: 'Full name, email, temporary password, and subject are required.'
    });
  }
  if (temporaryPassword.length < 12 || temporaryPassword.length > 72) {
    return res.status(400).json({
      message: 'Temporary password must contain between 12 and 72 characters.'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username?.trim() || null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        ...(normalizedUsername ? [{ username: normalizedUsername }] : [])
      ]
    },
    select: { id: true, email: true, username: true }
  });

  if (existing) {
    return res.status(409).json({
      message:
        existing.email === normalizedEmail
          ? 'Email is already registered.'
          : 'Username is already taken.'
    });
  }

  const normalizedTeacherStatus = ['PENDING', 'APPROVED', 'SUSPENDED'].includes(status)
    ? status
    : 'PENDING';
  const accountStatus = normalizedTeacherStatus === 'APPROVED'
    ? 'ACTIVE'
    : normalizedTeacherStatus;
  const supabase = requireSupabaseAdminClient();
  const {
    data: { user: authUser },
    error: createAuthError
  } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      account_type: 'teacher'
    }
  });

  if (createAuthError || !authUser) {
    return res.status(400).json({
      message: createAuthError?.message || 'Teacher authentication account could not be created.'
    });
  }

  let teacher;
  try {
    teacher = await prisma.$transaction(async (transaction) => {
      const teacherUser = await transaction.user.update({
        where: { authUserId: authUser.id },
        data: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          username: normalizedUsername,
          avatarUrl: avatarUrl?.trim() || null,
          role: 'TEACHER',
          status: accountStatus
        }
      });

      return transaction.teacherProfile.create({
        data: {
          userId: teacherUser.id,
          subject,
          experience: experience || null,
          bio: bio || null,
          contactEnabled: Boolean(contactEnabled),
          contactEmail: contactEmail?.trim() || null,
          contactPhone: contactPhone?.trim() || null,
          telegram: telegram?.trim() || null,
          status: normalizedTeacherStatus,
          accessRequest: {
            create: {
              status: normalizedTeacherStatus,
              reviewedAt: normalizedTeacherStatus === 'PENDING' ? null : new Date(),
              reviewedBy: normalizedTeacherStatus === 'PENDING' ? null : req.user.id
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              username: true,
              avatarUrl: true
            }
          }
        }
      });
    });
  } catch (error) {
    await supabase.auth.admin.deleteUser(authUser.id).catch(() => undefined);
    throw error;
  }

  res.status(201).json({
    teacher: {
      id: teacher.id,
      userId: teacher.userId,
      fullName: teacher.user.fullName,
      email: teacher.user.email,
      username: teacher.user.username,
      avatarUrl: teacher.user.avatarUrl,
      subject: teacher.subject,
      experience: teacher.experience,
      bio: teacher.bio,
      status: teacher.status
    }
  });
}

export async function updateTeacherStatus(req, res) {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid teacher status.' });
  }

  const teacher = await prisma.$transaction(async (transaction) => {
    const updatedTeacher = await transaction.teacherProfile.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true
          }
        }
      }
    });

    await transaction.user.update({
      where: { id: updatedTeacher.userId },
      data: {
        status: status === 'APPROVED' ? 'ACTIVE' : status
      }
    });

    await transaction.teacherAccessRequest.upsert({
      where: { teacherId: updatedTeacher.id },
      update: {
        status,
        reviewedAt: status === 'PENDING' ? null : new Date(),
        reviewedBy: status === 'PENDING' ? null : req.user.id,
        rejectionReason: status === 'REJECTED'
          ? rejectionReason?.trim() || 'Teacher access was rejected by admin.'
          : null
      },
      create: {
        teacherId: updatedTeacher.id,
        status,
        reviewedAt: status === 'PENDING' ? null : new Date(),
        reviewedBy: status === 'PENDING' ? null : req.user.id,
        rejectionReason: status === 'REJECTED'
          ? rejectionReason?.trim() || 'Teacher access was rejected by admin.'
          : null
      }
    });

    return updatedTeacher;
  });

  res.json({
    teacher: {
      id: teacher.id,
      userId: teacher.userId,
      fullName: teacher.user.fullName,
      email: teacher.user.email,
      username: teacher.user.username,
      subject: teacher.subject,
      status: teacher.status
    }
  });
}
