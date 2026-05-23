import { generateFeedbackForAttempt, getFeedbackForAttempt } from '../services/ai.service.js';

export async function generateFeedback(req, res) {
  const feedback = await generateFeedbackForAttempt(req.params.attemptId, req.user);
  res.json({ feedback });
}

export async function getFeedback(req, res) {
  const feedback = await getFeedbackForAttempt(req.params.attemptId, req.user);
  res.json({ feedback });
}
