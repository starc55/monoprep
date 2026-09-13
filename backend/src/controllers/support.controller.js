import { sendQuestionReport, sendSupportMessage } from '../services/support.service.js';

export async function createSupportMessage(req, res) {
  const result = await sendSupportMessage({
    user: req.user,
    contactEmail: req.body.contactEmail,
    subject: req.body.subject,
    message: req.body.message,
    pageUrl: req.body.pageUrl
  });

  res.status(201).json(result);
}

export async function createQuestionReport(req, res) {
  const result = await sendQuestionReport({
    user: req.user,
    attemptId: req.body.attemptId,
    questionId: req.body.questionId,
    telegramUsername: req.body.telegramUsername,
    reason: req.body.reason,
    message: req.body.message,
    pageUrl: req.body.pageUrl
  });

  res.status(201).json(result);
}
