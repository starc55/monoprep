import { prisma } from '../config/prisma.js';

export async function listPassages(req, res) {
  const passages = await prisma.passage.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json({ passages });
}

export async function createPassage(req, res) {
  const passage = await prisma.passage.create({
    data: req.body
  });

  res.status(201).json({ passage });
}

export async function updatePassage(req, res) {
  const passage = await prisma.passage.update({
    where: { id: req.params.id },
    data: req.body
  });

  res.json({ passage });
}

export async function deletePassage(req, res) {
  await prisma.passage.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Passage deleted successfully.' });
}
