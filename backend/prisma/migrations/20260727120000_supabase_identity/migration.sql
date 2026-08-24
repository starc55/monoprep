CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED');

ALTER TABLE "users"
ALTER COLUMN "password_hash" DROP NOT NULL,
ADD COLUMN "auth_user_id" UUID,
ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");
CREATE INDEX "users_status_role_idx" ON "users"("status", "role");
