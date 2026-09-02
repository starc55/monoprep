CREATE TYPE "ScoringModel" AS ENUM ('SAT_ESTIMATE_V1', 'RAW_PERCENT');
CREATE TYPE "AdaptiveModuleRole" AS ENUM ('STANDARD', 'MODULE_1', 'MODULE_2_LOWER', 'MODULE_2_HIGHER');

ALTER TABLE "exams"
  ADD COLUMN "scoring_model" "ScoringModel" NOT NULL DEFAULT 'SAT_ESTIMATE_V1',
  ADD COLUMN "score_conversion" JSONB;

ALTER TABLE "sections"
  ADD COLUMN "adaptive_role" "AdaptiveModuleRole" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "routing_threshold" INTEGER NOT NULL DEFAULT 60;

ALTER TABLE "questions"
  ADD COLUMN "is_pretest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "attempts"
  ADD COLUMN "selected_routes" JSONB;

CREATE INDEX "sections_exam_id_type_adaptive_role_idx"
  ON "sections"("exam_id", "type", "adaptive_role");
