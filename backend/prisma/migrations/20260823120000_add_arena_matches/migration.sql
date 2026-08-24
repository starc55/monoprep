CREATE TYPE "ArenaStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "arena_matches" (
  "id" TEXT NOT NULL,
  "challenger_id" TEXT NOT NULL,
  "opponent_id" TEXT,
  "size" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "ArenaStatus" NOT NULL DEFAULT 'WAITING',
  "question_refs" JSONB NOT NULL,
  "challenger_answers" JSONB,
  "opponent_answers" JSONB,
  "challenger_score" INTEGER,
  "opponent_score" INTEGER,
  "challenger_xp" INTEGER NOT NULL DEFAULT 0,
  "opponent_xp" INTEGER NOT NULL DEFAULT 0,
  "winner_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "arena_matches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "arena_matches_status_subject_size_created_at_idx" ON "arena_matches"("status", "subject", "size", "created_at");
CREATE INDEX "arena_matches_challenger_id_created_at_idx" ON "arena_matches"("challenger_id", "created_at");
CREATE INDEX "arena_matches_opponent_id_created_at_idx" ON "arena_matches"("opponent_id", "created_at");

ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
