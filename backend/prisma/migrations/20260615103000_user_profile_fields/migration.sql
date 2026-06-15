ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
