# MonoPrep Production Security

This document records the controls present in the repository as of the Production MVP review. It is a deployment checklist, not a claim that the application is immune to attack.

## 1. Architecture Overview

- Frontend: React and Vite, deployed as a browser SPA.
- Backend: Node.js and Express, exposed through `/api` routes.
- Database: Supabase PostgreSQL accessed by Prisma on the server.
- Authentication: Supabase Auth bearer sessions; the backend validates the bearer token and maps it to an application user.
- Analytics: PostHog is optional and enabled only when its public project key is configured.
- Monitoring: Sentry is optional on both applications and enabled only when a DSN is configured.

## 2. Authentication Security

Supabase owns password, OAuth, refresh-token, confirmation, and password-reset sessions. Protected API routes call `requireAuth`; the middleware validates the presented Supabase access token and loads the current application account. Disabled accounts are rejected. Login, registration, callback, forgot-password, and reset-password routes remain available while launch mode is active. Logout clears Supabase state, local application state, PostHog identity, and Sentry user context.

## 3. Authorization

Frontend route guards improve navigation but are not trusted as authorization. Admin routes use `requireAdmin`; exam management uses `requireExamManager`, which accepts only active administrators or active, approved teachers. Student-only attempt and competition actions use `requireStudent`. Tests verify that student tokens do not pass teacher/admin middleware and that pending teachers are rejected. Roles cannot be changed through the self-profile update schema.

## 4. Supabase Security

RLS is enabled for application tables exposed through Supabase. Private attempts, answers, feedback, statistics, and notifications are owner- or admin-readable. Profile reads are restricted to the current user or an administrator. Published exam content is gated by the `private.can_access_exam` function. Storage policies scope writes by authenticated user folder and role. Public buckets are intentionally limited to display assets; private course and assignment files require membership. The service-role key is read only by the backend and must never use a `VITE_` prefix.

No RLS migration was required for this change. Existing policies were reviewed and retained to avoid disrupting Prisma and current production data.

## 5. API Security

API routes use bearer authentication, server-side role checks, Zod schemas, route-specific resource checks, and safe error middleware. Expensive AI/PDF, upload, and support paths have dedicated limits in addition to the global API limiter. API responses receive `Cache-Control: no-store`. Production errors return safe messages while Sentry receives sanitized diagnostic context.

## 6. Frontend Security

Only `VITE_` values intended for browser use are referenced by frontend code. Arbitrary user HTML is not rendered: rich text is HTML-escaped before a small allowlist of formatting tags and generated math markup is inserted. Private routes are protected by auth guards and marked `noindex, nofollow`. The frontend CSP blocks plugins, framing, unapproved network destinations, and mixed content.

## 7. Database Security

Prisma parameterizes normal queries. No new raw SQL or mass-assignment path was introduced. Controllers are expected to authorize the current user before owner-scoped reads/writes and validation schemas constrain IDs, enums, lengths, and payload structure. Auth and admin responses must continue using explicit safe projections where sensitive models are involved.

## 8. HTTP Security Headers

Express uses Helmet and disables `x-powered-by`. Vercel adds HSTS, `nosniff`, strict referrer policy, permissions policy, and a CSP with `frame-ancestors 'none'`. The CSP contains narrow Supabase, PostHog, Sentry, Lordicon, backend, and Desmos destinations. Desmos currently requires `'unsafe-eval'`; this exception should be re-tested whenever the calculator SDK is upgraded. Inline styles/scripts remain permitted only where current Vite/runtime integrations require them.

## 9. CORS

Production CORS accepts only `CLIENT_URL`. Development additionally permits the two local Vite origins. Credentials are disabled because authentication uses an Authorization bearer header rather than cross-site cookies. The trusted-origin middleware applies the same server-controlled origin expectation to state-changing requests.

## 10. Rate Limiting

A global API limiter protects all `/api` routes. Stricter limits protect support, uploads, OpenAI, and PDF import operations. Limits are proxy-aware in production. They should be tuned from production traffic and PostHog/Sentry evidence without weakening expensive endpoints.

## 11. PostHog Privacy Configuration

PostHog initializes once in production only. Autocapture is disabled, events are allowlisted in code, and authenticated identity uses an internal stable ID rather than email. Session replay masks all inputs and password fields and marks sensitive DOM with a mask selector. Raw SAT answers, free text, tokens, cookies, and request headers are not event properties. Logout calls `posthog.reset()`.

## 12. Sentry Privacy Configuration

React and Express use environment DSNs, release/environment tags, and conservative tracing. `sendDefaultPii` is disabled. `beforeSend` recursively redacts token, authorization, cookie, password, secret, API-key, session, database URL, and payment-like keys. Backend request bodies, headers, cookies, and query strings are removed. User context contains only safe internal ID/role data.

## 13. Secret Management

Real `.env` files are ignored and examples contain placeholders only. Never commit Supabase service-role keys, database URLs, OpenAI keys, Telegram bot tokens, Sentry auth tokens, or provider credentials. Rotate any secret that appears in chat, source control, screenshots, or logs. Sentry source-map credentials are build-only variables and must not be prefixed with `VITE_`.

## 14. File Upload Security

Uploads use memory storage, route-level size limits, extension/MIME allowlists, binary content detection, generated storage names, and authenticated role checks. PDF imports are capped at the configured 20 MB application limit and validated as PDFs before processing. Supabase bucket limits remain an independent control. Never trust the browser-provided filename or MIME value alone.

## 15. SEO Security / Indexing Rules

Only `/`, `/products`, and selected legal routes are in the sitemap. Authenticated, admin, callback, account, settings, and exam routes receive `noindex, nofollow`; robots rules also discourage crawling them. These directives are discoverability controls, not authorization. API and private resources remain protected independently.

## 16. Logging and Monitoring

Morgan logs request metadata but not Authorization headers or request bodies. Application logs must never add tokens, passwords, database URLs, AI keys, or raw student answers. Sentry provides sanitized errors and sampled traces. PostHog provides intentionally selected product events and masked replay.

## 17. Production Environment Variables

Frontend-safe variables:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_SITE_URL`
- `VITE_LAUNCH_MODE`
- `VITE_PUBLIC_LAUNCH_AT`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_RELEASE`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`

Build-only variables:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

Backend variables:

- `NODE_ENV`
- `PORT`
- `CLIENT_URL`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TIMEOUT_MS`
- `EXAM_SUBMISSION_GRACE_MINUTES`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `SENTRY_TRACES_SAMPLE_RATE`

## 18. Security Changes Made

| Risk | Severity | Previous State | Fix | Status |
| --- | --- | --- | --- | --- |
| Production errors lacked centralized reporting | High | No complete React/Express Sentry wiring | Added sanitized frontend/backend Sentry initialization and ErrorBoundary | Complete |
| Analytics could collect excessive data if enabled casually | High | No production privacy baseline | Added manual events, masked replay, safe identity, and logout reset | Complete |
| Private API responses could be cached by intermediaries | High | No explicit API cache policy | Added `Cache-Control: no-store` | Complete |
| Browser security policy was incomplete | Medium | Minimal hosting headers | Added CSP, HSTS, referrer, permissions, and content-type headers | Complete |
| Dependency advisories | Medium | Vulnerable transitive/direct packages | Updated compatible packages and overrides; audits report zero known vulnerabilities | Complete |
| Public/private indexing ambiguity | Medium | Shared SPA metadata | Added route metadata, private noindex, robots, sitemap, and JSON-LD | Complete |
| Secret configuration drift | Medium | No committed environment templates | Added placeholder-only frontend/backend examples | Complete |

## 19. Remaining Risks

- Critical: none identified in this review.
- High: production DSNs/keys and provider dashboard privacy settings must be configured and verified by an account owner before observability is considered operational.
- Medium: the React SPA is client-rendered; search engines without JavaScript receive only baseline metadata. Prerender public pages in a later focused change if crawl coverage requires it.
- Medium: the Desmos integration currently needs the CSP `'unsafe-eval'` exception. Keep its allowed origins narrow and revisit on SDK upgrades.
- Medium: public exam/teacher asset buckets intentionally expose files by URL. Confirm this matches content licensing and business policy.
- Low: large JavaScript chunks remain. Continue route-level lazy loading and bundle analysis as a performance task.

## 20. Production Launch Security Checklist

- [ ] Production environment variables configured in the correct frontend/backend projects
- [ ] HTTPS and custom production domains active
- [ ] Supabase Site URL and allowed auth redirect URLs verified
- [x] Existing RLS and storage policies reviewed
- [x] Admin and exam-manager server authorization verified by tests
- [ ] Production `CLIENT_URL` CORS allowlist verified after deployment
- [x] Global and expensive-endpoint rate limits active
- [ ] PostHog replay masking verified with a real production recording
- [ ] Sentry scrubbing verified with safe frontend and backend test errors
- [x] `robots.txt` generated and reviewed
- [x] `sitemap.xml` generated and reviewed
- [ ] Sentry source-map upload credentials configured and upload verified
- [x] Repository frontend secret scan run
- [x] Frontend and backend dependency audits reviewed
- [x] Production frontend build completed
- [x] Backend tests and Prisma validation completed
