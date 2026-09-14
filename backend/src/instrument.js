import * as Sentry from '@sentry/node';
import { env } from './config/env.js';

const sensitiveKeyPattern = /authorization|cookie|password|token|secret|api[-_]?key|session|database_url|credit|card/i;

function sanitize(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}...[truncated]` : value;
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[Redacted]' : sanitize(item, seen)
    ])
  );
}

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    release: env.sentryRelease || undefined,
    sendDefaultPii: false,
    tracesSampleRate: env.sentryTracesSampleRate,
    integrations(defaultIntegrations) {
      return [
        ...defaultIntegrations.filter((integration) => integration.name !== 'RequestData'),
        Sentry.requestDataIntegration({
          include: {
            cookies: false,
            data: false,
            headers: false,
            ip: false,
            query_string: false,
            url: true
          }
        })
      ];
    },
    beforeSend(event) {
      const sanitized = sanitize(event);
      if (sanitized.request) {
        delete sanitized.request.cookies;
        delete sanitized.request.data;
        delete sanitized.request.headers;
        delete sanitized.request.query_string;
      }
      return sanitized;
    }
  });
}

export { Sentry };

