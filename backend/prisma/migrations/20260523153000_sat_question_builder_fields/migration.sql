ALTER TABLE "questions"
ADD COLUMN "audio_title" TEXT,
ADD COLUMN "instructions" TEXT,
ADD COLUMN "image_url" TEXT,
ADD COLUMN "formula_text" TEXT,
ADD COLUMN "table_data" JSONB,
ADD COLUMN "calculator_allowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transcript" TEXT,
ADD COLUMN "audio_replay_limit" INTEGER,
ADD COLUMN "accepted_answers" JSONB;
