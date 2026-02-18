-- 공개 이벤트/프로젝트 체험용 컬럼 추가

-- clubs: 모집 마감일
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS recruitment_deadline_at TIMESTAMPTZ;

-- projects: 공개 범위, 프로젝트 타입, 포스터, 모집 마감
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'club_only'
    CHECK (visibility IN ('club_only', 'private', 'public'));
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'free'
    CHECK (project_type IN ('paid', 'free', 'participation_fee'));
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recruitment_deadline_at TIMESTAMPTZ;

-- projects.status 확장: scheduled, ongoing, ended 추가
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled', 'scheduled', 'ongoing', 'ended'));

-- RLS: 공개(public) 프로젝트는 비로그인도 조회 가능 (체험용)
DROP POLICY IF EXISTS "projects_read_member" ON public.projects;
CREATE POLICY "projects_read_member_or_public" ON public.projects FOR SELECT USING (
  (visibility = 'public')
  OR
  (EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.club_id = projects.club_id AND m.user_id = auth.uid() AND m.status = 'approved'
  ))
);
