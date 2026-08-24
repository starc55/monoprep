ALTER TABLE public.desmos_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blitz_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.desmos_lessons FROM anon, authenticated;
REVOKE ALL ON TABLE public.blitz_sessions FROM anon, authenticated;

GRANT SELECT ON TABLE public.desmos_lessons TO authenticated;
GRANT SELECT ON TABLE public.blitz_sessions TO authenticated;

CREATE POLICY desmos_lessons_authenticated_read
ON public.desmos_lessons
FOR SELECT
TO authenticated
USING (is_published OR private.is_admin());

CREATE POLICY blitz_sessions_owner_read
ON public.blitz_sessions
FOR SELECT
TO authenticated
USING (user_id = private.current_app_user_id() OR private.is_admin());
