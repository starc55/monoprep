ALTER TABLE public.teacher_access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.teacher_access_requests FROM anon, authenticated;
GRANT SELECT ON public.teacher_access_requests TO authenticated;

CREATE POLICY teacher_access_request_owner_read
ON public.teacher_access_requests
FOR SELECT
TO authenticated
USING (
  private.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.teacher_profiles
    WHERE teacher_profiles.id = teacher_access_requests.teacher_id
      AND teacher_profiles.user_id = private.current_app_user_id()
  )
);
