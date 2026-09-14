import posthog from "posthog-js";

const apiKey = import.meta.env.VITE_POSTHOG_KEY?.trim();
const apiHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
let initialized = false;
let lastPagePath = "";
const onceEvents = new Set();

export function initAnalytics() {
  if (initialized || !apiKey) return Boolean(apiKey);

  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    persistence: "localStorage",
    person_profiles: "identified_only",
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { password: true },
      maskTextSelector: "[data-private], .math-field, .question-response",
    },
    loaded(client) {
      if (import.meta.env.DEV) client.opt_out_capturing();
    },
  });
  initialized = true;
  return true;
}

export function captureEvent(name, properties = {}) {
  if (!initAnalytics() || import.meta.env.DEV) return;
  posthog.capture(name, properties);
}

export function captureEventOnce(name, properties = {}) {
  if (onceEvents.has(name)) return;
  onceEvents.add(name);
  captureEvent(name, properties);
}

export function capturePageView(pathname) {
  if (!pathname || pathname === lastPagePath) return;
  lastPagePath = pathname;
  captureEvent("$pageview", { path: pathname });
}

export function identifyAnalyticsUser(user) {
  if (!user?.id || !initAnalytics() || import.meta.env.DEV) return;
  posthog.identify(user.id, {
    role: user.role,
    has_premium_access: Boolean(user.hasPremiumAccess),
    teacher_approval_status: user.teacherApprovalStatus || undefined,
  });
}

export function resetAnalytics() {
  if (initialized && !import.meta.env.DEV) posthog.reset();
}
