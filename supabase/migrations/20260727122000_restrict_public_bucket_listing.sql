DROP POLICY IF EXISTS avatar_public_read ON storage.objects;
DROP POLICY IF EXISTS teacher_files_public_read ON storage.objects;
DROP POLICY IF EXISTS exam_assets_public_read ON storage.objects;

CREATE POLICY avatar_owner_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY teacher_files_authorized_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (private.is_admin() OR private.is_approved_teacher())
);

CREATE POLICY exam_assets_admin_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND private.is_admin()
);
