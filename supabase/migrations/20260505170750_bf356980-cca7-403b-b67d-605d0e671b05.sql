DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_update_own_basic
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_blocked = false
  AND blocked_until IS NULL
);

DROP POLICY IF EXISTS user_roles_insert_own ON public.user_roles;

CREATE POLICY user_roles_insert_own_safe
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('oqituvchi'::app_role, 'oquvchi'::app_role)
);