# MonoPrep Supabase Migration

## Status

As of July 30, 2026, the local MonoPrep runtime is fully cut over to Supabase:

- All 26 MonoPrep application tables and all 104 Neon rows are present in Supabase.
- Source and target row counts match for every application table.
- Four legacy profiles are linked to four Supabase Auth identities.
- Four supported bcrypt hashes were restored into Supabase Auth, so existing users
  retain their previous passwords; all public profile password hashes remain null.
- The legacy base64 avatar was moved into the `avatars` Storage bucket.
- RLS is enabled on every application table and all foreign keys validate.
- The Express backend uses the Supabase IPv4 session pooler through Prisma.
- Student, admin, and approved-teacher authenticated API smoke tests pass.
- Neon is preserved unchanged as a temporary rollback source.

The remaining tasks are Dashboard configuration rather than data migration: enable
leaked-password protection and configure production Auth redirects/SMTP/Google OAuth.

## Architecture

Previous:

- Neon PostgreSQL
- Express-issued JWT cookie
- bcrypt password hashes in `public.users`
- local `backend/uploads` storage

Target:

- Supabase PostgreSQL remains accessed through Prisma from Express.
- Supabase Auth owns passwords, OAuth identities, sessions, verification, and recovery.
- The browser sends a Supabase access token to Express as a bearer token.
- Express verifies the token with Supabase and loads the linked application profile.
- RLS closes direct Data API access unless a specific authenticated policy allows it.
- Supabase Storage owns new avatars and uploaded admin assets.

The Express backend remains the business-logic gateway. The service-role key is used
only by the backend for trusted admin operations such as teacher account creation.

## Identity Model

`public.users.id` remains text so every existing MonoPrep foreign key can be preserved.
`public.users.auth_user_id` links that profile to `auth.users.id`.

- New users: `users.id` and `auth_user_id` both equal the Supabase Auth UUID.
- Existing users: the original CUID remains `users.id`; `auth_user_id` stores the new
  Supabase Auth UUID.
- Password hashes are nullable and are not used by application code after cutover.
- `status` is independent from role and supports `ACTIVE`, `PENDING`, `SUSPENDED`, and
  `REJECTED`.
- Premium access and course enrollment remain independent.
- Teacher approval remains in `teacher_profiles.status`.

The legacy-user trigger only links an existing profile when an Auth user contains the
matching `legacy_profile_id` in protected app metadata. Browser-supplied user metadata
cannot authorize this link.

## Environment

Copy the example files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Backend:

- `DATABASE_URL`: Supabase session pooler connection for the long-running Express app.
- `DIRECT_URL`: Supabase direct/session connection used by Prisma migrations.
- `SUPABASE_URL`: project API URL.
- `SUPABASE_PUBLISHABLE_KEY`: publishable key used to verify user sessions.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only secret for Auth admin and Storage operations.
- `CLIENT_URL`: local or deployed frontend origin.

Frontend:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never place the service-role key, database password, Google secret, Neon credentials,
or OpenAI key in a `VITE_` variable.

## Supabase Dashboard

### URL Configuration

Open **Authentication -> URL Configuration**.

Production Site URL:

```text
https://YOUR_FRONTEND_DOMAIN
```

Redirect URLs:

```text
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
https://YOUR_FRONTEND_DOMAIN/auth/callback
https://YOUR_FRONTEND_DOMAIN/reset-password
```

Keep email confirmation enabled. Update Confirm signup, Invite user, and Reset password
templates with MonoPrep branding. Configure custom SMTP before sending the migration
reset campaign at production volume.

### Google OAuth

In Google Cloud Console:

1. Create or select the MonoPrep OAuth client.
2. Add the frontend domains to Authorized JavaScript origins.
3. Add this exact Authorized redirect URI:

```text
https://PROJECT_REF.supabase.co/auth/v1/callback
```

In **Supabase Authentication -> Providers -> Google**, add the Google Client ID and
Client Secret, then enable the provider.

### API Keys

- Put the publishable key in frontend and backend environment variables.
- Put the service-role key only in backend hosting.
- Rotate any secret accidentally exposed to a browser or source control.

## Database Migrations

Prisma-compatible schema migrations live in:

```text
backend/prisma/migrations
```

Supabase-specific trigger, RLS, and Storage migrations live in:

```text
supabase/migrations
```

The target schema was applied through Supabase's migration API. Prisma's 14 existing
migrations were baselined on July 30, 2026, and `prisma migrate status` now reports
that the database schema is up to date. The commands used were:

```powershell
Set-Location backend
npx prisma migrate resolve --applied 20260518114449_init
npx prisma migrate resolve --applied 20260523153000_sat_question_builder_fields
npx prisma migrate resolve --applied 20260601120000_option_image_url
npx prisma migrate resolve --applied 20260615103000_user_profile_fields
npx prisma migrate resolve --applied 20260615114500_learning_hub_models
npx prisma migrate resolve --applied 20260616090000_social_learning_models
npx prisma migrate resolve --applied 20260622120000_exam_access_type
npx prisma migrate resolve --applied 20260708120000_course_teacher_module
npx prisma migrate resolve --applied 20260712100000_support_session_bookings
npx prisma migrate resolve --applied 20260722130000_security_hardening
npx prisma migrate resolve --applied 20260727120000_supabase_identity
npx prisma migrate resolve --applied 20260727123000_cover_foreign_keys
npx prisma migrate resolve --applied 20260727125000_teacher_access_requests
npx prisma migrate resolve --applied 20260727131000_preserve_profiles_on_auth_delete
```

Do not run `prisma migrate reset` against Supabase.

## RLS Summary

The browser cannot write application business tables directly. Express performs those
operations after token validation.

Implemented read boundaries:

- Users can read safe profile columns; password hashes are never granted.
- Users can update only their own name, username, and avatar columns.
- Premium exams require a valid premium date; free published exams remain available.
- Attempts, answers, feedback, skill stats, notifications, and bookings are owner-only.
- Teachers can read only classes they teach.
- Students can read only classes in which they have an active enrollment.
- Assignment submissions are visible only to the student, assigned teacher, or admin.
- Course materials, announcements, and live sessions require class membership.
- Admin checks use a protected server-side helper, not user metadata.

Security-definer helpers use an empty search path, have public execution revoked, and
are granted only to authenticated/service roles where needed.

## Storage

Buckets:

- `avatars`: public delivery, owner-only list/upload/update/delete.
- `teacher-files`: public delivery, admin or approved-teacher writes.
- `exam-assets`: public delivery, admin writes.
- `course-materials`: private, teacher/class ownership and enrollment checks.
- `assignment-files`: private, student ownership and teacher/class reads.

Path conventions:

```text
avatars/{authUserId}/avatar.ext
teacher-files/{authUserId}/{fileId}
exam-assets/{authUserId}/{fileId}
course-materials/{teacherAuthUserId}/{classId}/{fileId}
assignment-files/{classId}/{assignmentId}/{studentAuthUserId}/{fileId}
```

New profile avatars and admin images already use Storage. Existing local URLs remain
readable during the migration window. Move old files to the matching bucket and update
their stored URLs before removing `backend/uploads`.

## Neon Backup and Data Copy

Do not delete or modify Neon before validation.

The cutover used a non-destructive JSON backup because PostgreSQL client tools were
not available locally:

```powershell
Set-Location backend
npm run backup:neon
node src/scripts/prepareSupabaseImport.js --backup=C:\path\to\neon-data.json
```

The verified backup is stored outside the Git repository under
`C:\Users\New\Desktop\MonoPrep\migration-backups`. It contains sensitive legacy
account data and must not be committed or shared. A standard PostgreSQL backup can
also be created later:

```powershell
pg_dump "$env:NEON_DATABASE_URL" `
  --format=custom `
  --no-owner `
  --no-privileges `
  --file=monoprep-neon-backup.dump

pg_dump "$env:NEON_DATABASE_URL" `
  --data-only `
  --column-inserts `
  --no-owner `
  --no-privileges `
  --schema=public `
  --exclude-table=public._prisma_migrations `
  --file=monoprep-neon-data.sql
```

Restore only after verifying the backup size and keeping a checksum:

```powershell
Get-FileHash monoprep-neon-backup.dump -Algorithm SHA256
psql "$env:DIRECT_URL" --set ON_ERROR_STOP=1 --single-transaction --file monoprep-neon-data.sql
```

Validate before user migration:

```sql
select count(*) from users;
select count(*) from exams;
select count(*) from attempts;
select count(*) from course_enrollments;
select count(*) from assignment_submissions;
select count(*) from support_session_bookings;

select count(*) as orphan_attempts
from attempts a
left join users u on u.id = a.user_id
where u.id is null;
```

## Existing Users

Supabase Auth supports bcrypt password hashes. The four migrated users had verified
bcrypt hashes restored from the Neon backup on July 30, 2026, so their previous
email/password credentials continue to work. The public `users.password_hash` values
remain null because password ownership now belongs exclusively to Supabase Auth.

Temporary credentials generated during the intermediate migration step are retained
only as an audit artifact outside the repository:

```text
C:\Users\New\Desktop\MonoPrep\migration-backups\supabase-auth-temporary-credentials.json
```

Users can still use password recovery when needed. For future legacy imports, the
reusable migration flow remains:

```powershell
Set-Location backend
npm run migrate:legacy-auth
```

4. Create Auth identities without sending email:

```powershell
npm run migrate:legacy-auth -- --apply
```

5. After reviewing the linked counts, send reset emails in controlled batches:

```powershell
npm run migrate:legacy-auth -- --apply --send-reset
```

The script is idempotent by email and clears the legacy hash after linking.

## First Admin and Teachers

For a fresh target with no imported admin, set:

```text
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
BOOTSTRAP_ADMIN_FULL_NAME
```

Then:

```powershell
npm run bootstrap:admin
npm run bootstrap:admin -- --apply
```

Teachers cannot self-register. An authenticated admin creates a teacher from the
existing admin UI. The backend creates the Supabase Auth identity with a temporary
password, then creates a `PENDING` teacher profile. Only admin approval changes both
the teacher status and account status to active.

## Local Development

Terminal 1:

```powershell
Set-Location backend
npm install
npm run prisma:generate
npm run dev
```

Terminal 2:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is
`http://localhost:5000/api/health`.

## Deployment

Vercel frontend:

- Root directory: `frontend`
- Build command: `npm run build`
- Output: `dist`
- Add all three `VITE_` variables.
- Add production Auth callback/reset routes to Supabase.

Render or another long-running backend:

- Root directory: `backend`
- Build command: `npm ci && npm run prisma:generate`
- Start command: `npm start`
- Add `DATABASE_URL`, `DIRECT_URL`, Supabase keys, `CLIENT_URL`, and optional service
  integrations.
- Never expose the service-role key in Vercel frontend variables.

## Validation Checklist

- Email signup creates exactly one Auth user and one profile.
- Unverified signup does not enter protected routes.
- Email login restores a session after refresh.
- Google callback creates/loads the same profile.
- Forgot/reset routes work locally and in production.
- Suspended/rejected users receive 403 from Express.
- Pending teachers can see only the pending page.
- Approved teachers can access only their own classes.
- Premium-only users do not receive `My Teacher`.
- Course-only users do not receive premium exams.
- Attempts, results, analytics, leaderboard, and avatars preserve identity.
- Storage object access is denied across user/class boundaries.
- Frontend bundle contains no service-role key.

Automated checks:

```powershell
Set-Location backend
npm run test:auth
npm run security:frontend
npm run verify:supabase
npm run verify:supabase:strict
```

Strict verification currently passes. Supabase's database advisor reports one Auth
configuration warning: leaked-password protection is disabled. Enable it in
Authentication settings. The frontend dependency audit still reports two moderate
React Router advisories on the current React Router 6 line. The available automated
fix upgrades to React Router 7 and is a breaking routing migration, so it must be
handled as a separate tested upgrade rather than forced during the database cutover.

## Rollback

1. Keep Neon active and read-only during validation.
2. Record the final Neon export timestamp and Supabase import timestamp.
3. If validation fails before accepting new production writes, redeploy the previous
   application commit and restore its Neon environment variables.
4. If Supabase has accepted new writes, stop writes first and export those rows before
   rollback. Do not silently discard attempts or submissions.
5. Do not drop Supabase or Neon tables until the retention window and reconciliation
   are complete.

## Known Manual Actions

- Enable leaked-password protection in Supabase Authentication settings.
- Configure Site URL, redirect URLs, email templates, and SMTP.
- Configure Google Cloud OAuth and enable the Google provider in Supabase.
- Copy the verified Supabase environment variables to the production hosting services.
