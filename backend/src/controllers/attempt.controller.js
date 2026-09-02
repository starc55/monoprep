import {
  completeAttemptSection,
  getAttemptById,
  listAttemptsForUser,
  saveAttemptAnswer,
  startAttemptForUser,
  submitAttempt,
} from "../services/attempt.service.js";

export const startAttempt = async (req, res) => {
  const attempt = await startAttemptForUser(req.user, req.body.examId);
  res.status(201).json({ attempt });
};

export async function answerAttempt(req, res) {
  const answer = await saveAttemptAnswer(req.params.id, req.user.id, req.body);
  res.json({ answer });
}

export async function completeSection(req, res) {
  const attempt = await completeAttemptSection(
    req.params.id,
    req.params.sectionId,
    req.user.id
  );
  res.json({ attempt });
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
