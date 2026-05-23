# MonoPrep

SAT-style practice platform built with React, Vite, CSS, Express, Prisma, Neon PostgreSQL, custom JWT auth, bcrypt password hashing, OpenAI-powered feedback, and Framer Motion.

## Stack

- Frontend: React + Vite + CSS
- Backend: Node.js + Express
- Database: Neon PostgreSQL
- ORM: Prisma
- Auth: custom JWT access token
- Password hashing: bcrypt
- AI feedback: backend API calling OpenAI
- Motion: Framer Motion

No external backend-as-a-service runtime is used.

## Environment

Backend `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_CHAT_ID="your-telegram-chat-id"
PORT=5000
CLIENT_URL=http://localhost:5173
```

Frontend `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Default seeded users:

- Admin: `admin@satai.com` / `Admin123!`
- Student: `student@satai.com` / `Student123!`

## API

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`

Exams:

- `GET /api/exams`
- `GET /api/exams/:id`
- `POST /api/exams`
- `PUT /api/exams/:id`
- `DELETE /api/exams/:id`

Attempts:

- `POST /api/attempts/start`
- `POST /api/attempts/:id/answer`
- `POST /api/attempts/:id/submit`
- `GET /api/attempts/:id`
- `GET /api/attempts/me`

AI:

- `POST /api/ai/feedback/:attemptId`
- `GET /api/ai/feedback/:attemptId`

Support:

- `POST /api/support`

Admin:

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/attempts`

Content management:

- `/api/sections`
- `/api/passages`
- `/api/questions`
- `/api/options`

## Product Behavior

- Student login redirects to `/dashboard`.
- Admin login redirects to `/admin`.
- Students cannot access `/admin`.
- Admin has a separate layout and sidebar.
- Student sidebar never shows admin links.
- Exam mode includes timer, mark for review, answer autosave, question palette, submit, scoring, review, and AI feedback.
- Bluebook-like exam experience is preserved with original MonoPrep branding.
