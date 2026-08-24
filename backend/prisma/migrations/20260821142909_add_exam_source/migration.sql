DO $$
BEGIN
  CREATE TYPE "ExamSource" AS ENUM ('MONOPREP', 'OFFICIAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "exam_source" "ExamSource" NOT NULL DEFAULT 'MONOPREP';

CREATE INDEX IF NOT EXISTS "exams_exam_source_is_published_created_at_idx"
  ON "exams"("exam_source", "is_published", "created_at");
