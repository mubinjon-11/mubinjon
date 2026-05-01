-- Allow admins to view all profiles
CREATE POLICY "profiles_select_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all user_roles
CREATE POLICY "user_roles_select_admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all results
CREATE POLICY "results_select_admin"
ON public.results
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));