DROP POLICY IF EXISTS "teacher_profiles_course_read" ON "teacher_profiles";
DROP POLICY IF EXISTS "courses_members_read" ON "courses";
DROP POLICY IF EXISTS "course_classes_members_read" ON "course_classes";
DROP POLICY IF EXISTS "course_enrollments_members_read" ON "course_enrollments";
DROP POLICY IF EXISTS "course_assignments_members_read" ON "course_assignments";
DROP POLICY IF EXISTS "assignment_submissions_members_read" ON "assignment_submissions";
DROP POLICY IF EXISTS "course_materials_members_read" ON "course_materials";
DROP POLICY IF EXISTS "course_announcements_members_read" ON "course_announcements";
DROP POLICY IF EXISTS "live_sessions_members_read" ON "live_sessions";

DROP POLICY IF EXISTS "assignment_files_members_read" ON storage.objects;
DROP POLICY IF EXISTS "assignment_files_student_insert" ON storage.objects;
DROP POLICY IF EXISTS "assignment_files_student_update" ON storage.objects;
DROP POLICY IF EXISTS "course_materials_members_read" ON storage.objects;
DROP POLICY IF EXISTS "course_materials_teacher_insert" ON storage.objects;
DROP POLICY IF EXISTS "course_materials_teacher_update" ON storage.objects;

DROP FUNCTION IF EXISTS private.teaches_class(text);
DROP FUNCTION IF EXISTS private.is_enrolled(text);

DROP TABLE IF EXISTS "assignment_submissions";
DROP TABLE IF EXISTS "course_materials";
DROP TABLE IF EXISTS "course_announcements";
DROP TABLE IF EXISTS "live_sessions";
DROP TABLE IF EXISTS "course_assignments";
DROP TABLE IF EXISTS "course_enrollments";
DROP TABLE IF EXISTS "course_classes";
DROP TABLE IF EXISTS "courses";

DROP TYPE IF EXISTS "AssignmentSubmissionStatus";
DROP TYPE IF EXISTS "EnrollmentStatus";

CREATE POLICY "teacher_profiles_self_or_admin_read"
ON "teacher_profiles"
FOR SELECT
TO authenticated
USING ("user_id" = private.current_app_user_id() OR private.is_admin());
