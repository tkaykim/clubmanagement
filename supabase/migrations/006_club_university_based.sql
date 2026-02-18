-- 대학 마스터 + 동아리 대학 기반 여부/기반 대학
CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS is_university_based BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clubs_university ON public.clubs(university_id);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "universities_read_all" ON public.universities;
CREATE POLICY "universities_read_all" ON public.universities FOR SELECT USING (true);
