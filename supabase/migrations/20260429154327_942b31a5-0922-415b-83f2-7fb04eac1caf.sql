
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('oqituvchi', 'oquvchi');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert_own" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tests (created by teachers)
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  grade TEXT,
  question_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tests_select_all_authenticated" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "tests_insert_teacher" ON public.tests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'oqituvchi'));
CREATE POLICY "tests_update_own" ON public.tests FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "tests_delete_own" ON public.tests FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

-- Questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select_all_authenticated" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_insert_teacher" ON public.questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.teacher_id = auth.uid()));
CREATE POLICY "questions_update_teacher" ON public.questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.teacher_id = auth.uid()));
CREATE POLICY "questions_delete_teacher" ON public.questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.teacher_id = auth.uid()));

-- Results
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT,
  mode TEXT NOT NULL DEFAULT 'oddiy', -- oddiy | daraja
  score INT NOT NULL,
  total INT NOT NULL,
  percentage NUMERIC NOT NULL,
  level TEXT,
  test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_select_own" ON public.results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "results_insert_own" ON public.results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
