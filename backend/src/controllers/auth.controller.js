import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { signToken } from '../utils/jwt.js';

function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role
  };
}

export async function register(req, res) {
  const { fullName, email, password } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      passwordHash
    }
  });

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: serializeUser(user)
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: serializeUser(user)
  });
}

export async function me(req, res) {
  res.json({ user: req.user });
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
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
      avatarUrl: true,
      role: true
    }
  });

  res.json({ user });
}
