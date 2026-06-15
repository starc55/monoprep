import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

function cleanMentorPayload(payload) {
  return {
    name: payload.name,
    subject: payload.subject,
    bio: payload.bio || null,
    imageUrl: payload.imageUrl || null,
    telegram: payload.telegram || null,
    phone: payload.phone || null,
    slots: payload.slots || [],
    rating: payload.rating ?? 5,
    isActive: payload.isActive ?? true
  };
}

export async function listMentors(req, res) {
  const includeInactive = req.user?.role === 'ADMIN' && req.query.includeInactive === 'true';
  const mentors = await prisma.mentor.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }]
  });

  res.json({ mentors });
}

export async function createMentor(req, res) {
  const mentor = await prisma.mentor.create({
    data: cleanMentorPayload(req.body)
  });

  res.status(201).json({ mentor });
}

export async function updateMentor(req, res) {
  const existing = await prisma.mentor.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    throw new ApiError(404, 'Mentor not found.');
  }

  const data = {};
  for (const key of ['name', 'subject', 'bio', 'imageUrl', 'telegram', 'phone', 'slots', 'rating', 'isActive']) {
    if (req.body[key] !== undefined) {
      data[key] = req.body[key] || (['bio', 'imageUrl', 'telegram', 'phone'].includes(key) ? null : req.body[key]);
    }
  }

  const mentor = await prisma.mentor.update({
    where: { id: req.params.id },
    data
  });

  res.json({ mentor });
}

export async function deleteMentor(req, res) {
  await prisma.mentor.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Mentor deleted successfully.' });
}
