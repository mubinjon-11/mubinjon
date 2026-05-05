DROP POLICY IF EXISTS profiles_update_own_basic ON public.profiles;

CREATE POLICY profiles_update_own_basic
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  AND is_blocked = false
  AND blocked_until IS NULL
)
WITH CHECK (
  auth.uid() = id
  AND is_blocked = false
  AND blocked_until IS NULL
);