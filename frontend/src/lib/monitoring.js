import * as Sentry from "@sentry/react";

const sensitiveKeyPattern = /authorization|cookie|password|token|secret|api[-_]?key|session|database_url|credit|card/i;

function sanitize(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 2000 ? `${value.slice(0, 2000)}...[truncated]` : value;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[Redacted]" : sanitize(item, seen),
    ])
  );
}

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    beforeSend(event) {
      const sanitized = sanitize(event);
      if (sanitized.request) {
        delete sanitized.request.cookies;
        delete sanitized.request.data;
        delete sanitized.request.headers;
        delete sanitized.request.query_string;
      }
      return sanitized;
    },
  });
  return true;
}

export function setMonitoringUser(user) {
  Sentry.setUser(user?.id ? { id: user.id, role: user.role } : null);
}

export function setMonitoringRoute(pathname) {
  Sentry.setTag("route", pathname || "unknown");
}

export { Sentry };
