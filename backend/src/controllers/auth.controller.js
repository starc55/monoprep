import { prisma } from '../config/prisma.js';

function serializeUser(user) {
  return {
    id: user.id,
    authUserId: user.authUserId,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    premiumUntil: user.premiumUntil,
    hasPremiumAccess: Boolean(user.premiumUntil && new Date(user.premiumUntil) > new Date()),
    teacherApprovalStatus: user.teacherProfile?.status || null,
    teacherSubject: user.teacherProfile?.subject || null
  };
}

const authUserInclude = {
  teacherProfile: {
    select: {
      status: true,
      subject: true
    }
  }
};

export async function me(req, res) {
  res.json({ user: serializeUser(req.user) });
}

export async function updateMe(req, res) {
  const username = req.body.username?.trim() || null;
  if (username) {
    const existing = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: req.user.id }
      },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }
  }

  const data = {};
  if (req.body.fullName !== undefined) {
    data.fullName = req.body.fullName.trim();
  }
  if (req.body.username !== undefined) {
    data.username = username;
  }
  if (req.body.avatarUrl !== undefined) {
    data.avatarUrl = req.body.avatarUrl || null;
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    include: authUserInclude
  });

  res.json({ user: serializeUser(user) });
}
