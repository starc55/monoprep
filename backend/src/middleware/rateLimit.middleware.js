import { rateLimit } from 'express-rate-limit';

function createLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message }
  });
}

export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: 'Too many requests. Please try again shortly.'
});

export const aiLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: 'AI feedback limit reached. Please try again later.'
});

export const supportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Support message limit reached. Please try again later.'
});

export const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: 'Upload limit reached. Please try again later.'
});
