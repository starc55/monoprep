# MonoPrep

MonoPrep is a SAT practice platform built with React, Vite, Express, Prisma, Supabase,
OpenAI feedback, and Framer Motion.

## Stack

- Frontend: React 18 + Vite
- Backend: Node.js 22 + Express
- Database: Supabase PostgreSQL through Prisma
- Auth: Supabase Auth (email/password, recovery, Google OAuth, persistent sessions)
- Storage: Supabase Storage
- Authorization: Express business rules plus PostgreSQL RLS
- AI feedback: OpenAI from the backend only

Premium subscriptions and course enrollments are independent. Premium unlocks platform
features; an active course enrollment unlocks `My Teacher`.

## Start Locally

Create environment files from the committed examples and fill in the Supabase values:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Backend:

```powershell
Set-Location backend
npm install
npm run prisma:generate
npm run dev
```

Frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The API health check is
`http://localhost:5000/api/health`.

Set `VITE_DESMOS_API_KEY` in `frontend/.env` for the official embedded Desmos
Graphing Calculator in production. Local development uses Desmos's documented demo key.

## Authentication

The browser authenticates directly with Supabase and sends the access token to Express
as `Authorization: Bearer <token>`. Express verifies it with Supabase and loads the
linked MonoPrep profile before applying role, premium, enrollment, and ownership rules.

Application auth endpoints:

- `GET /api/auth/me`
- `PUT /api/auth/me`

Password signup/login, Google OAuth, verification, logout, and recovery use the
Supabase client.

## Migration

The full Neon-to-Supabase runbook, environment variables, RLS policies, Storage paths,
Google OAuth setup, existing-user reset strategy, deployment steps, and rollback plan
are in [docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md).

Do not run a destructive Prisma reset or delete Neon until the migration validation
checklist is complete.
