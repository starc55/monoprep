import { prisma } from '../config/prisma.js';
import { examDeepInclude } from '../prisma/selects.js';
import { getExamForUser, listExamsForUser } from '../services/attempt.service.js';
import { ApiError } from '../utils/apiError.js';

async function validateCompetitionSchedule(payload, excludeId = null) {
  if (payload.contentMode === 'QUESTION_HUB' && payload.competitionKind !== 'NONE') {
    throw new ApiError(400, 'Question Hub sets cannot be scheduled as official competitions.');
  }
  if (!payload.competitionKind || payload.competitionKind === 'NONE') return;
  if (!payload.competitionStartsAt || !payload.competitionEndsAt) {
    throw new ApiError(400, 'Competition start and end dates are required.');
  }

  const startsAt = new Date(payload.competitionStartsAt);
  const endsAt = new Date(payload.competitionEndsAt);
  if (endsAt <= startsAt) throw new ApiError(400, 'Competition end time must be after its start time.');

  let rangeStart;
  let rangeEnd;
  if (payload.competitionKind === 'FULL') {
    rangeStart = new Date(startsAt.getFullYear(), startsAt.getMonth(), 1);
    rangeEnd = new Date(startsAt.getFullYear(), startsAt.getMonth() + 1, 1);
  } else {
    const cadenceWindow = 13 * 24 * 60 * 60 * 1000;
    rangeStart = new Date(startsAt.getTime() - cadenceWindow);
    rangeEnd = new Date(startsAt.getTime() + cadenceWindow);
  }

  const conflict = await prisma.exam.findFirst({
    where: {
      competitionKind: payload.competitionKind,
      competitionStartsAt: { gte: rangeStart, lt: rangeEnd },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { title: true }
  });
  if (conflict) {
    const cadence = payload.competitionKind === 'FULL' ? 'this month' : 'this 2-week window';
    throw new ApiError(409, `Only one ${payload.competitionKind.toLowerCase()} competition is allowed in ${cadence}.`);
  }
}

export async function listExams(req, res) {
  const exams = await listExamsForUser(req.user);
  res.json({ exams });
}

export async function getExam(req, res) {
  const exam = await getExamForUser(req.params.id, req.user);
  res.json({ exam });
}

export async function createExam(req, res) {
  await validateCompetitionSchedule(req.body);
  const exam = await prisma.exam.create({
    data: req.body,
    include: examDeepInclude
  });

  res.status(201).json({ exam });
}

export async function updateExam(req, res) {
  const existing = await prisma.exam.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Exam not found.');
  await validateCompetitionSchedule({ ...existing, ...req.body }, req.params.id);
  const exam = await prisma.exam.update({
    where: { id: req.params.id },
    data: req.body,
    include: examDeepInclude
  });

  res.json({ exam });
}

export async function deleteExam(req, res) {
  await prisma.exam.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Exam deleted successfully.' });
}
