CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER TABLE public.users
ADD CONSTRAINT users_auth_user_id_fkey
FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION private.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = (SELECT auth.uid())
    AND status IN ('ACTIVE', 'PENDING')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = (SELECT auth.uid())
      AND role = 'ADMIN'
      AND status = 'ACTIVE'
  )
$$;

CREATE OR REPLACE FUNCTION private.is_approved_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS app_user
    JOIN public.teacher_profiles AS teacher
      ON teacher.user_id = app_user.id
    WHERE app_user.auth_user_id = (SELECT auth.uid())
      AND app_user.status = 'ACTIVE'
      AND app_user.role = 'TEACHER'
      AND teacher.status = 'APPROVED'
  )
$$;

CREATE OR REPLACE FUNCTION private.teaches_class(target_class_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_classes AS course_class
    JOIN public.teacher_profiles AS teacher
      ON teacher.id = course_class.teacher_id
    JOIN public.users AS app_user
      ON app_user.id = teacher.user_id
    WHERE course_class.id = target_class_id
      AND app_user.auth_user_id = (SELECT auth.uid())
      AND app_user.status = 'ACTIVE'
      AND teacher.status = 'APPROVED'
  )
$$;

CREATE OR REPLACE FUNCTION private.is_enrolled(target_class_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments AS enrollment
    JOIN public.users AS app_user
      ON app_user.id = enrollment.student_id
    WHERE enrollment.class_id = target_class_id
      AND enrollment.status = 'ACTIVE'
      AND app_user.auth_user_id = (SELECT auth.uid())
      AND app_user.status = 'ACTIVE'
  )
$$;

CREATE OR REPLACE FUNCTION private.can_access_exam(target_exam_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exams AS exam
    JOIN public.users AS app_user
      ON app_user.auth_user_id = (SELECT auth.uid())
    WHERE exam.id = target_exam_id
      AND app_user.status = 'ACTIVE'
      AND (
        app_user.role IN ('ADMIN', 'TEACHER')
        OR (
          exam.is_published = true
          AND (
            exam.access_type = 'FREE'
            OR app_user.premium_until > now()
          )
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION private.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_approved_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.teaches_class(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_enrolled(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_exam(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_approved_teacher() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.teaches_class(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_enrolled(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_exam(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_profile public.users%ROWTYPE;
  display_name text;
BEGIN
  SELECT *
  INTO existing_profile
  FROM public.users
  WHERE email = lower(NEW.email)
  LIMIT 1;

  IF existing_profile.id IS NOT NULL AND existing_profile.auth_user_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'This email belongs to a legacy MonoPrep account awaiting migration.';
  END IF;

  display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (
    id,
    auth_user_id,
    full_name,
    email,
    password_hash,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.id,
    display_name,
    lower(NEW.email),
    NULL,
    'STUDENT',
    'ACTIVE',
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET email = excluded.email,
      updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'teacher_profiles',
    'courses',
    'course_classes',
    'course_enrollments',
    'course_assignments',
    'assignment_submissions',
    'course_materials',
    'course_announcements',
    'live_sessions',
    'follows',
    'notifications',
    'achievements',
    'user_achievements',
    'mentors',
    'support_session_bookings',
    'question_bank_items',
    'exams',
    'sections',
    'passages',
    'questions',
    'options',
    'attempts',
    'user_answers',
    'ai_feedback',
    'skill_stats'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END
$$;

GRANT SELECT (
  id,
  auth_user_id,
  full_name,
  email,
  username,
  avatar_url,
  role,
  status,
  premium_until,
  created_at,
  updated_at
) ON public.users TO authenticated;
GRANT UPDATE (full_name, username, avatar_url, updated_at)
ON public.users TO authenticated;

GRANT SELECT ON
  public.teacher_profiles,
  public.courses,
  public.course_classes,
  public.course_enrollments,
  public.course_assignments,
  public.assignment_submissions,
  public.course_materials,
  public.course_announcements,
  public.live_sessions,
  public.follows,
  public.notifications,
  public.achievements,
  public.user_achievements,
  public.mentors,
  public.support_session_bookings,
  public.question_bank_items,
  public.exams,
  public.sections,
  public.passages,
  public.questions,
  public.options,
  public.attempts,
  public.user_answers,
  public.ai_feedback,
  public.skill_stats
TO authenticated;

CREATE POLICY users_authenticated_read
ON public.users
FOR SELECT
TO authenticated
USING (
  status = 'ACTIVE'
  OR auth_user_id = (SELECT auth.uid())
  OR private.is_admin()
);

CREATE POLICY users_self_update
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = (SELECT auth.uid()) AND status = 'ACTIVE')
WITH CHECK (auth_user_id = (SELECT auth.uid()) AND status = 'ACTIVE');

CREATE POLICY exams_authorized_read
ON public.exams
FOR SELECT
TO authenticated
USING (private.can_access_exam(id));

CREATE POLICY sections_authorized_read
ON public.sections
FOR SELECT
TO authenticated
USING (private.can_access_exam(exam_id));

CREATE POLICY questions_authorized_read
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sections
    WHERE sections.id = questions.section_id
      AND private.can_access_exam(sections.exam_id)
  )
);

CREATE POLICY options_authorized_read
ON public.options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions
    JOIN public.sections ON sections.id = questions.section_id
    WHERE questions.id = options.question_id
      AND private.can_access_exam(sections.exam_id)
  )
);

CREATE POLICY passages_authorized_read
ON public.passages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions
    JOIN public.sections ON sections.id = questions.section_id
    WHERE questions.passage_id = passages.id
      AND private.can_access_exam(sections.exam_id)
  )
  OR private.is_admin()
  OR private.is_approved_teacher()
);

CREATE POLICY attempts_owner_read
ON public.attempts
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id() OR private.is_admin());

CREATE POLICY user_answers_owner_read
ON public.user_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.attempts
    WHERE attempts.id = user_answers.attempt_id
      AND (
        attempts.user_id = private.current_app_user_id()
        OR private.is_admin()
      )
  )
);

CREATE POLICY ai_feedback_owner_read
ON public.ai_feedback
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id() OR private.is_admin());

CREATE POLICY skill_stats_owner_read
ON public.skill_stats
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id() OR private.is_admin());

CREATE POLICY notifications_owner_read
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id() OR private.is_admin());

CREATE POLICY follows_community_read
ON public.follows
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY achievements_authenticated_read
ON public.achievements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY user_achievements_community_read
ON public.user_achievements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY teacher_profiles_course_read
ON public.teacher_profiles
FOR SELECT
TO authenticated
USING (
  user_id = private.current_app_user_id()
  OR private.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.course_classes
    WHERE course_classes.teacher_id = teacher_profiles.id
      AND private.is_enrolled(course_classes.id)
  )
);

CREATE POLICY courses_members_read
ON public.courses
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.course_classes
    WHERE course_classes.course_id = courses.id
      AND (
        private.teaches_class(course_classes.id)
        OR private.is_enrolled(course_classes.id)
      )
  )
);

CREATE POLICY course_classes_members_read
ON public.course_classes
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR private.teaches_class(id)
  OR private.is_enrolled(id)
);

CREATE POLICY course_enrollments_members_read
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR student_id = private.current_app_user_id()
  OR private.teaches_class(class_id)
);

CREATE POLICY course_assignments_members_read
ON public.course_assignments
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR private.teaches_class(class_id)
  OR private.is_enrolled(class_id)
);

CREATE POLICY assignment_submissions_members_read
ON public.assignment_submissions
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR student_id = private.current_app_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.course_assignments
    WHERE course_assignments.id = assignment_submissions.assignment_id
      AND private.teaches_class(course_assignments.class_id)
  )
);

CREATE POLICY course_materials_members_read
ON public.course_materials
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR private.teaches_class(class_id)
  OR private.is_enrolled(class_id)
);

CREATE POLICY course_announcements_members_read
ON public.course_announcements
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR private.teaches_class(class_id)
  OR private.is_enrolled(class_id)
);

CREATE POLICY live_sessions_members_read
ON public.live_sessions
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR private.teaches_class(class_id)
  OR private.is_enrolled(class_id)
);

CREATE POLICY active_mentors_authenticated_read
ON public.mentors
FOR SELECT
TO authenticated
USING (is_active = true OR private.is_admin());

CREATE POLICY support_bookings_owner_read
ON public.support_session_bookings
FOR SELECT
TO authenticated
USING (student_id = private.current_app_user_id() OR private.is_admin());

CREATE POLICY active_question_bank_authenticated_read
ON public.question_bank_items
FOR SELECT
TO authenticated
USING (is_active = true OR private.is_admin() OR private.is_approved_teacher());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  ),
  (
    'teacher-files',
    'teacher-files',
    true,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
  ),
  (
    'exam-assets',
    'exam-assets',
    true,
    26214400,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg'
    ]
  ),
  (
    'course-materials',
    'course-materials',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4'
    ]
  ),
  (
    'assignment-files',
    'assignment-files',
    false,
    26214400,
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
  )
ON CONFLICT (id) DO UPDATE
SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

CREATE POLICY avatar_public_read
ON storage.objects
FOR SELECT
TO PUBLIC
USING (bucket_id = 'avatars');

CREATE POLICY avatar_owner_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY avatar_owner_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY avatar_owner_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY teacher_files_public_read
ON storage.objects
FOR SELECT
TO PUBLIC
USING (bucket_id = 'teacher-files');

CREATE POLICY teacher_files_authorized_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (private.is_admin() OR private.is_approved_teacher())
);

CREATE POLICY teacher_files_authorized_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teacher-files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (private.is_admin() OR private.is_approved_teacher())
)
WITH CHECK (
  bucket_id = 'teacher-files'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (private.is_admin() OR private.is_approved_teacher())
);

CREATE POLICY exam_assets_public_read
ON storage.objects
FOR SELECT
TO PUBLIC
USING (bucket_id = 'exam-assets');

CREATE POLICY exam_assets_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND private.is_admin()
);

CREATE POLICY exam_assets_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exam-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND private.is_admin()
)
WITH CHECK (
  bucket_id = 'exam-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND private.is_admin()
);

CREATE POLICY course_materials_members_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    private.is_admin()
    OR private.teaches_class((storage.foldername(name))[2])
    OR private.is_enrolled((storage.foldername(name))[2])
  )
);

CREATE POLICY course_materials_teacher_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (
    private.is_admin()
    OR private.teaches_class((storage.foldername(name))[2])
  )
);

CREATE POLICY course_materials_teacher_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (
    private.is_admin()
    OR private.teaches_class((storage.foldername(name))[2])
  )
)
WITH CHECK (
  bucket_id = 'course-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (
    private.is_admin()
    OR private.teaches_class((storage.foldername(name))[2])
  )
);

CREATE POLICY assignment_files_members_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND (
    private.is_admin()
    OR private.teaches_class((storage.foldername(name))[1])
    OR (
      (storage.foldername(name))[3] = (SELECT auth.uid())::text
      AND private.is_enrolled((storage.foldername(name))[1])
    )
  )
);

CREATE POLICY assignment_files_student_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files'
  AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
  AND private.is_enrolled((storage.foldername(name))[1])
);

CREATE POLICY assignment_files_student_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
  AND private.is_enrolled((storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'assignment-files'
  AND (storage.foldername(name))[3] = (SELECT auth.uid())::text
  AND private.is_enrolled((storage.foldername(name))[1])
);
