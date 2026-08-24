ALTER TABLE "desmos_lessons"
ADD COLUMN "image_urls" JSONB;

UPDATE "desmos_lessons"
SET "image_urls" = jsonb_build_array("image_url")
WHERE "image_url" IS NOT NULL;

ALTER TABLE "passages"
ADD COLUMN "attachment_url" TEXT,
ADD COLUMN "attachment_name" TEXT,
ADD COLUMN "attachment_mime_type" TEXT;
