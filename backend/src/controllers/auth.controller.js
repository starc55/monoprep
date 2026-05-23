import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { signToken } from '../utils/jwt.js';

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
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
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
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateMe(req, res) {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      fullName: req.body.fullName
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  });

  res.json({ user });
}
