import { env } from '../config/env.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const developmentOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

export function requireTrustedOrigin(req, res, next) {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }

  if (origin === env.clientUrl || (!env.isProduction && developmentOrigins.has(origin))) {
    next();
    return;
  }

  res.status(403).json({ message: 'Request origin is not allowed.' });
}
