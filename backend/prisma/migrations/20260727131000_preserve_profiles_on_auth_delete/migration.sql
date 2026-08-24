ALTER TABLE "users"
DROP CONSTRAINT "users_auth_user_id_fkey";

ALTER TABLE "users"
ADD CONSTRAINT "users_auth_user_id_fkey"
FOREIGN KEY ("auth_user_id") REFERENCES auth.users("id")
ON DELETE SET NULL ON UPDATE CASCADE;
