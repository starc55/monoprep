import { prisma } from '../config/prisma.js';

export async function createSection(req, res) {
  const section = await prisma.section.create({
    data: req.body
  });

  res.status(201).json({ section });
}

export async function updateSection(req, res) {
  const section = await prisma.section.update({
    where: { id: req.params.id },
    data: req.body
  });

  res.json({ section });
}

export async function deleteSection(req, res) {
  await prisma.section.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Section deleted successfully.' });
}
