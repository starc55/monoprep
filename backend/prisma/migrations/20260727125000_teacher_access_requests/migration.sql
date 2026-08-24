ALTER TYPE "TeacherStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TYPE "TeacherAccessRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TABLE "teacher_access_requests" (
  "id" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  "status" "TeacherAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by" TEXT,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_access_requests_teacher_id_key"
ON "teacher_access_requests"("teacher_id");

CREATE INDEX "teacher_access_requests_status_requested_at_idx"
ON "teacher_access_requests"("status", "requested_at");

CREATE INDEX "teacher_access_requests_reviewed_by_idx"
ON "teacher_access_requests"("reviewed_by");

ALTER TABLE "teacher_access_requests"
ADD CONSTRAINT "teacher_access_requests_teacher_id_fkey"
FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teacher_access_requests"
ADD CONSTRAINT "teacher_access_requests_reviewed_by_fkey"
FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
