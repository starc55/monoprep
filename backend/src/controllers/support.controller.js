import { sendSupportMessage } from '../services/support.service.js';

export async function createSupportMessage(req, res) {
  const result = await sendSupportMessage({
    user: req.user,
    subject: req.body.subject,
    message: req.body.message,
    pageUrl: req.body.pageUrl
  });

  res.status(201).json(result);
}
