CREATE TABLE "question_hub_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer" JSONB,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "correct" BOOLEAN,
    "marked" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_hub_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_hub_progress_user_id_question_key_key"
ON "question_hub_progress"("user_id", "question_key");

CREATE INDEX "question_hub_progress_user_id_updated_at_idx"
ON "question_hub_progress"("user_id", "updated_at");

ALTER TABLE "question_hub_progress"
ADD CONSTRAINT "question_hub_progress_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_hub_progress" ENABLE ROW LEVEL SECURITY;
