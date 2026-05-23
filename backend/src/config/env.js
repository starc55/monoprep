import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sat_ai_platform'),
  jwtSecret: requireEnv('JWT_SECRET', 'super-secret-development-jwt-key'),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || ''
};
