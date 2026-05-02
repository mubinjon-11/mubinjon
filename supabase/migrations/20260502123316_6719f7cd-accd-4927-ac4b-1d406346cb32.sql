
-- Add blocking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz;

-- Admin can update any profile (block/unblock)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any profile
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete user roles (when removing user)
CREATE POLICY "user_roles_delete_admin"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any test
CREATE POLICY "tests_delete_admin"
  ON public.tests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any question
CREATE POLICY "questions_delete_admin"
  ON public.questions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete results too (cleanup when removing users)
CREATE POLICY "results_delete_admin"
  ON public.results FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
