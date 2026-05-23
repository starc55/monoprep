import { prisma } from '../config/prisma.js';
import { examDeepInclude } from '../prisma/selects.js';
import { getExamForUser, listExamsForUser } from '../services/attempt.service.js';

export async function listExams(req, res) {
  const exams = await listExamsForUser(req.user);
  res.json({ exams });
}

export async function getExam(req, res) {
  const exam = await getExamForUser(req.params.id, req.user);
  res.json({ exam });
}

export async function createExam(req, res) {
  const exam = await prisma.exam.create({
    data: req.body,
    include: examDeepInclude
  });

  res.status(201).json({ exam });
}

export async function updateExam(req, res) {
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
