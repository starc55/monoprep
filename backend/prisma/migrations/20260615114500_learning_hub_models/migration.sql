CREATE TABLE "mentors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bio" TEXT,
    "image_url" TEXT,
    "telegram" TEXT,
    "phone" TEXT,
    "slots" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_bank_items" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB,
    "correct_answer" JSONB NOT NULL,
    "explanation" TEXT,
    "is_bluebook" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mentors_is_active_created_at_idx" ON "mentors"("is_active", "created_at");
CREATE INDEX "question_bank_items_subject_domain_skill_idx" ON "question_bank_items"("subject", "domain", "skill");
CREATE INDEX "question_bank_items_is_active_created_at_idx" ON "question_bank_items"("is_active", "created_at");
