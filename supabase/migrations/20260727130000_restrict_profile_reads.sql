ALTER POLICY users_authenticated_read
ON public.users
USING (
  auth_user_id = (SELECT auth.uid())
  OR private.is_admin()
);
