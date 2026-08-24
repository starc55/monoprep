CREATE TYPE "ExamAccessType" AS ENUM ('FREE', 'PAID');

ALTER TABLE "exams"
ADD COLUMN "access_type" "ExamAccessType" NOT NULL DEFAULT 'FREE';
