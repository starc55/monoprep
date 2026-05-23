-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('FULL_LENGTH', 'PRACTICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('reading_writing', 'math', 'listening', 'custom_practice');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'multi_choice', 'text_input', 'passage_question', 'audio_question', 'math_question');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'REVIEWED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ExamType" NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "passage_id" TEXT,
    "type" "QuestionType" NOT NULL,
    "skill" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "question_text" TEXT NOT NULL,
    "audio_url" TEXT,
    "correct_answer" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "total_score" INTEGER,
    "reading_writing_score" INTEGER,
    "math_score" INTEGER,
    "listening_score" INTEGER,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "is_correct" BOOLEAN,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "marked_for_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feedback" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "questions_seen" INTEGER NOT NULL DEFAULT 0,
    "questions_correct" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sections_exam_id_order_index_idx" ON "sections"("exam_id", "order_index");

-- CreateIndex
CREATE INDEX "questions_section_id_order_index_idx" ON "questions"("section_id", "order_index");

-- CreateIndex
CREATE INDEX "questions_passage_id_idx" ON "questions"("passage_id");

-- CreateIndex
CREATE INDEX "options_question_id_order_index_idx" ON "options"("question_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "options_question_id_label_key" ON "options"("question_id", "label");

-- CreateIndex
CREATE INDEX "attempts_user_id_started_at_idx" ON "attempts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "attempts_exam_id_status_idx" ON "attempts"("exam_id", "status");

-- CreateIndex
CREATE INDEX "user_answers_question_id_idx" ON "user_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_attempt_id_question_id_key" ON "user_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_feedback_attempt_id_key" ON "ai_feedback"("attempt_id");

-- CreateIndex
CREATE INDEX "ai_feedback_user_id_created_at_idx" ON "ai_feedback"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "skill_stats_user_id_accuracy_idx" ON "skill_stats"("user_id", "accuracy");

-- CreateIndex
CREATE UNIQUE INDEX "skill_stats_user_id_skill_key" ON "skill_stats"("user_id", "skill");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "passages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_stats" ADD CONSTRAINT "skill_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
