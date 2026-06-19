ALTER TABLE public.results 
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS questions_snapshot JSONB;