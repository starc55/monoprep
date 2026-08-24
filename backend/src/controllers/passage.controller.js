import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

function ensurePassageMaterial(content, attachmentUrl) {
  if (String(content || '').trim().length < 20 && !attachmentUrl) {
    throw new ApiError(400, 'Provide at least 20 characters of passage text or attach a passage file.');
  }
}

export async function listPassages(req, res) {
  const passages = await prisma.passage.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json({ passages });
}

export async function createPassage(req, res) {
  ensurePassageMaterial(req.body.content, req.body.attachmentUrl);
  const passage = await prisma.passage.create({
    data: req.body
  });

  res.status(201).json({ passage });
}

export async function updatePassage(req, res) {
  const existing = await prisma.passage.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Passage not found.');

  ensurePassageMaterial(
    req.body.content ?? existing.content,
    req.body.attachmentUrl === undefined ? existing.attachmentUrl : req.body.attachmentUrl
  );
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
