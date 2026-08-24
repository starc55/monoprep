ALTER TABLE "users"
ADD COLUMN "premium_until" TIMESTAMP(3),
ADD COLUMN "auth_token_version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "users_premium_until_idx" ON "users"("premium_until");
