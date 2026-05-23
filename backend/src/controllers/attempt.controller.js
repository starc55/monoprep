import {
  getAttemptById,
  listAttemptsForUser,
  saveAttemptAnswer,
  startAttemptForUser,
  submitAttempt,
} from "../services/attempt.service.js";
import { prisma } from "../config/prisma.js";

export const startAttempt = async (req, res) => {
  try {
    const { examId } = req.body;
    const userId = req.user?.id;

    console.log("START BODY:", req.body);
    console.log("START USER:", req.user);

    if (!examId) {
      return res.status(400).json({ message: "examId is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        isPublished: true,
      },
    });

    console.log("FOUND EXAM:", exam);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (!exam.isPublished && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Exam is not published" });
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId,
        examId,
        status: "IN_PROGRESS",
      },
    });

    console.log("CREATED ATTEMPT:", attempt);

    return res.status(201).json({ attempt });
  } catch (error) {
    console.error("START ATTEMPT ERROR:", error);

    return res.status(500).json({
      message: "Failed to start attempt",
      error: error.message,
      code: error.code,
      meta: error.meta,
    });
  }
};

export async function answerAttempt(req, res) {
  const answer = await saveAttemptAnswer(req.params.id, req.user.id, req.body);
  res.json({ answer });
}

export async function submitAttemptController(req, res) {
  const attempt = await submitAttempt(req.params.id, req.user.id);
  res.json({ attempt });
}

export async function getAttempt(req, res) {
  const attempt = await getAttemptById(req.params.id, req.user, false);
  res.json({ attempt });
}

export async function getMyAttempts(req, res) {
  const attempts = await listAttemptsForUser(req.user.id);
  res.json({ attempts });
}
