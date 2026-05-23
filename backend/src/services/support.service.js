import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatSupportMessage({ user, subject, message, pageUrl }) {
  return [
    '<b>MonoPrep support request</b>',
    '',
    `<b>Subject:</b> ${escapeHtml(subject)}`,
    `<b>User:</b> ${escapeHtml(user.fullName)} (${escapeHtml(user.email)})`,
    `<b>Role:</b> ${escapeHtml(user.role)}`,
    pageUrl ? `<b>Page:</b> ${escapeHtml(pageUrl)}` : '',
    '',
    `<b>Message:</b>\n${escapeHtml(message)}`
  ].filter(Boolean).join('\n');
}

export async function sendSupportMessage({ user, subject, message, pageUrl }) {
  if (!env.telegramBotToken || !env.telegramChatId) {
    throw new ApiError(
      503,
      'Telegram support is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID on the backend.'
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: env.telegramChatId,
      text: formatSupportMessage({ user, subject, message, pageUrl }),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new ApiError(502, 'Telegram could not receive the support message.', details);
  }

  return { sent: true };
}
