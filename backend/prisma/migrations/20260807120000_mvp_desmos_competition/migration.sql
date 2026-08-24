CREATE TYPE "ExamContentMode" AS ENUM ('REAL_EXAM', 'QUESTION_HUB');
CREATE TYPE "CompetitionKind" AS ENUM ('NONE', 'FULL', 'MATH', 'ENGLISH');
CREATE TYPE "BlitzStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

ALTER TABLE "exams"
ADD COLUMN "content_mode" "ExamContentMode" NOT NULL DEFAULT 'REAL_EXAM',
ADD COLUMN "competition_kind" "CompetitionKind" NOT NULL DEFAULT 'NONE',
ADD COLUMN "competition_starts_at" TIMESTAMP(3),
ADD COLUMN "competition_ends_at" TIMESTAMP(3);

CREATE TABLE "desmos_lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "theory" TEXT NOT NULL,
    "image_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "desmos_lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blitz_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "subject" TEXT,
    "status" "BlitzStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "question_refs" JSONB NOT NULL,
    "answers" JSONB,
    "correct_count" INTEGER,
    "score" INTEGER,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "blitz_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "desmos_lessons_is_published_sort_order_idx" ON "desmos_lessons"("is_published", "sort_order");
CREATE INDEX "desmos_lessons_created_by_id_idx" ON "desmos_lessons"("created_by_id");
CREATE INDEX "blitz_sessions_user_id_started_at_idx" ON "blitz_sessions"("user_id", "started_at");
CREATE INDEX "blitz_sessions_status_started_at_idx" ON "blitz_sessions"("status", "started_at");

ALTER TABLE "desmos_lessons" ADD CONSTRAINT "desmos_lessons_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blitz_sessions" ADD CONSTRAINT "blitz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "support_session_bookings";
DROP TABLE IF EXISTS "mentors";
