import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  next();
}
