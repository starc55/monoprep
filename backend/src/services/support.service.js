import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { getAttemptById } from './attempt.service.js';

const TELEGRAM_TIMEOUT_MS = 10_000;

const REPORT_REASON_LABELS = {
  INCORRECT_ANSWER: 'Incorrect answer key',
  QUESTION_TEXT: 'Question text issue',
  ANSWER_CHOICES: 'Answer choices issue',
  EXPLANATION: 'Explanation issue',
  IMAGE: 'Image or diagram issue',
  OTHER: 'Other issue'
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatSupportMessage({ user, subject, message, pageUrl }) {
  return [
    '<b>MONOPREP SUPPORT</b>',
    '<i>New message from the platform</i>',
    '',
    '#support',
    '',
    `<b>Subject:</b> ${escapeHtml(subject)}`,
    `<b>User:</b> ${escapeHtml(user.fullName)} (${escapeHtml(user.email)})`,
    `<b>Role:</b> ${escapeHtml(user.role)}`,
    pageUrl ? `<b>Page:</b> ${escapeHtml(pageUrl)}` : '',
    '',
    `<b>Message:</b>\n${escapeHtml(message)}`
  ].filter(Boolean).join('\n');
}

function displayAnswer(answer) {
  if (answer === undefined || answer === null) return 'No answer';
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer !== 'object') return String(answer);
  if (Array.isArray(answer.values)) return answer.values.join(', ');
  if (answer.value !== undefined && answer.value !== null) return String(answer.value);
  return JSON.stringify(answer);
}

function getCorrectAnswer(question) {
  const values = question?.correctAnswer?.values
    || question?.correctAnswer?.acceptedAnswers
    || question?.acceptedAnswers;
  if (Array.isArray(values) && values.length) return values.join(', ');
  if (question?.correctAnswer?.value !== undefined) return displayAnswer(question.correctAnswer.value);
  const labels = (question?.options || [])
    .filter((option) => option.isCorrect)
    .map((option) => option.label);
  return labels.length ? labels.join(', ') : 'Not available';
}

export function formatQuestionReportMessage({ user, attempt, section, question, answer, reason, message, pageUrl }) {
  const questionNumber = (section.questions || []).findIndex((item) => item.id === question.id) + 1;
  const prompt = String(question.questionText || '').slice(0, 700);
  return [
    '<b>MONOPREP EXAM REPORT</b>',
    '<i>A student reported a possible question issue</i>',
    '',
    '#question_report',
    '',
    `<b>Issue:</b> ${escapeHtml(REPORT_REASON_LABELS[reason] || reason)}`,
    `<b>Student:</b> ${escapeHtml(user.fullName)} (${escapeHtml(user.email)})`,
    `<b>Exam:</b> ${escapeHtml(attempt.exam.title)}`,
    `<b>Module:</b> ${escapeHtml(section.title)}`,
    `<b>Question:</b> ${questionNumber}`,
    `<b>Skill:</b> ${escapeHtml(question.skill || 'Not specified')}`,
    `<b>Student answer:</b> ${escapeHtml(displayAnswer(answer?.answer))}`,
    `<b>Current correct answer:</b> ${escapeHtml(getCorrectAnswer(question))}`,
    '',
    `<b>Question text:</b>\n${escapeHtml(prompt)}`,
    message ? `\n<b>Student note:</b>\n${escapeHtml(message)}` : '',
    pageUrl ? `\n<b>Review page:</b> ${escapeHtml(pageUrl)}` : '',
    '',
    `<code>attempt:${escapeHtml(attempt.id)} question:${escapeHtml(question.id)}</code>`
  ].filter(Boolean).join('\n');
}

async function sendTelegramMessage(text) {
  if (!env.telegramBotToken || !env.telegramChatId) {
    throw new ApiError(
      503,
      'Telegram support is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID on the backend.'
    );
  }

  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS)
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ApiError(504, 'Support delivery timed out. Please try again.');
    }
    throw new ApiError(502, 'Support could not receive the message right now.');
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new ApiError(502, 'Telegram could not receive the support message.', details);
  }
}

export async function sendSupportMessage({ user, subject, message, pageUrl }) {
  await sendTelegramMessage(formatSupportMessage({ user, subject, message, pageUrl }));
  return { sent: true };
}

export async function sendQuestionReport({ user, attemptId, questionId, reason, message, pageUrl }) {
  const attempt = await getAttemptById(attemptId, user, false);
  if (attempt.status === 'IN_PROGRESS') {
    throw new ApiError(400, 'Question reports are available after the exam is submitted.');
  }

  let section;
  let question;
  for (const candidate of attempt.exam.sections || []) {
    const found = (candidate.questions || []).find((item) => item.id === questionId);
    if (found) {
      section = candidate;
      question = found;
      break;
    }
  }

  if (!question || !section) {
    throw new ApiError(404, 'Question was not found in this attempt.');
  }

  const answer = (attempt.answers || []).find((item) => item.questionId === questionId);
  await sendTelegramMessage(formatQuestionReportMessage({
    user,
    attempt,
    section,
    question,
    answer,
    reason,
    message,
    pageUrl
  }));

  return { sent: true };
}
