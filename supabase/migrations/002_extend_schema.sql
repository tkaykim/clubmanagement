-- clubs.recruitment_deadline_at, club_applications, projects 확장 컬럼
-- (Supabase MCP로 이미 적용된 경우 이 파일은 건너뛸 수 있음)

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS recruitment_deadline_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.club_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  memo TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'club_only' CHECK (visibility IN ('club_only', 'private', 'public'));
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'free' CHECK (project_type IN ('paid', 'free', 'participation_fee'));
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recruitment_deadline_at TIMESTAMPTZ;

-- status check 확장 (기존 CHECK 있으면 수동 조정 필요)
-- DO $$ BEGIN ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check; EXCEPTION WHEN OTHERS THEN NULL; END $$;
-- ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status IN ('planning', 'scheduled', 'in_progress', 'ongoing', 'completed', 'ended', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_club_applications_club ON public.club_applications(club_id);

ALTER TABLE public.club_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_applications_read_member" ON public.club_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_applications.club_id AND m.user_id = auth.uid() AND m.status = 'approved')
  OR auth.uid() = club_applications.user_id
);
CREATE POLICY "club_applications_insert_self" ON public.club_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "club_applications_update_admin" ON public.club_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = club_applications.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);
