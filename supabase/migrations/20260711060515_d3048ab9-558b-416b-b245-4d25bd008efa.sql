
-- user_stats: XP, level, streak
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_stats_own_select" ON public.user_stats FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_stats_own_insert" ON public.user_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_stats_own_update" ON public.user_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- achievements catalog
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Trophy',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_read_all" ON public.achievements FOR SELECT TO authenticated USING (true);

-- user_achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_ach_select_own" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_ach_insert_own" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  score INTEGER,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject, level)
);
GRANT SELECT, INSERT, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select_own" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cert_insert_own" ON public.certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- avatar_url on profiles (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- seed achievements
INSERT INTO public.achievements (code, name, description, icon, xp_reward) VALUES
  ('first_test', 'Birinchi qadam', 'Birinchi testni yechdingiz', 'Sparkles', 50),
  ('perfect_score', 'Mukammallik', '100% natijaga erishdingiz', 'Star', 200),
  ('streak_3', '3 kunlik streak', '3 kun ketma-ket faol bo''ldingiz', 'Flame', 100),
  ('streak_7', 'Haftalik jangchi', '7 kun ketma-ket faol bo''ldingiz', 'Flame', 300),
  ('streak_30', 'Oylik chempion', '30 kun ketma-ket faol bo''ldingiz', 'Crown', 1000),
  ('tests_10', '10 ta test', '10 ta testni yechdingiz', 'Target', 150),
  ('tests_50', '50 ta test', '50 ta testni yechdingiz', 'Trophy', 500),
  ('level_up_5', 'Yulduzcha', '5-darajaga chiqdingiz', 'Award', 200),
  ('polyglot', 'Poliglot', '3 xil til bo''yicha test yechdingiz', 'Languages', 250),
  ('scholar', 'Olim', '5 xil fan bo''yicha test yechdingiz', 'GraduationCap', 300)
ON CONFLICT (code) DO NOTHING;
