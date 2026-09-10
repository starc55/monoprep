import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function requireEnv(name, developmentFallback) {
  const configuredValue = process.env[name]?.trim();
  const value = configuredValue || (!isProduction ? developmentFallback : undefined);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 5000),
  databaseUrl: requireEnv('DATABASE_URL'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabasePublishableKey: requireEnv('SUPABASE_PUBLISHABLE_KEY'),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
  examSubmissionGraceMinutes: positiveInteger('EXAM_SUBMISSION_GRACE_MINUTES', 15),
  openAiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
  openAiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini',
  openAiTimeoutMs: positiveInteger('OPENAI_TIMEOUT_MS', 30_000),
  clientUrl: requireEnv('CLIENT_URL', 'http://localhost:5173'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || ''
};
