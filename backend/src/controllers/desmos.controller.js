import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export async function listDesmosLessons(req, res) {
  const canManage = req.user.role === 'ADMIN';
  const lessons = await prisma.desmosLesson.findMany({
    where: canManage ? {} : { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
  });

  res.json({ lessons });
}

export async function createDesmosLesson(req, res) {
  const lesson = await prisma.desmosLesson.create({
    data: {
      ...req.body,
      createdById: req.user.id
    }
  });

  res.status(201).json({ lesson });
}

export async function updateDesmosLesson(req, res) {
  const existing = await prisma.desmosLesson.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Desmos lesson not found.');

  const lesson = await prisma.desmosLesson.update({
    where: { id: req.params.id },
    data: req.body
  });

  res.json({ lesson });
}

export async function deleteDesmosLesson(req, res) {
  const existing = await prisma.desmosLesson.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Desmos lesson not found.');

  await prisma.desmosLesson.delete({ where: { id: req.params.id } });
  res.json({ message: 'Desmos lesson deleted.' });
}
