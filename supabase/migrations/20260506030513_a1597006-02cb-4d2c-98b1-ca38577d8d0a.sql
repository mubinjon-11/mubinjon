
-- Lessons cache (shared content per subject/level/position)
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  level text NOT NULL,
  position integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, level, position)
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_select_authenticated
  ON public.lessons FOR SELECT TO authenticated USING (true);

CREATE POLICY lessons_admin_all
  ON public.lessons FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Per-user learning progress
CREATE TABLE public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  level text NOT NULL,
  position integer NOT NULL,
  best_score integer NOT NULL DEFAULT 0,
  best_total integer NOT NULL DEFAULT 0,
  best_percentage numeric NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  passed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject, level, position)
);

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY lp_select_own
  ON public.learning_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY lp_insert_own
  ON public.learning_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY lp_update_own
  ON public.learning_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY lp_admin_all
  ON public.learning_progress FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lp_user_subject ON public.learning_progress(user_id, subject, level);
