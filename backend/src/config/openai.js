import OpenAI from 'openai';
import { env } from './env.js';

export const openai = env.openAiApiKey
  ? new OpenAI({ apiKey: env.openAiApiKey })
  : null;
