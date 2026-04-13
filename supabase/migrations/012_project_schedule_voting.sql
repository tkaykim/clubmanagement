-- 프로젝트 일정 투표 시스템
-- 관리자가 후보 날짜를 설정하고, 참여자가 각 날짜별 가능 시간대를 투표

-- 1. projects 테이블 확장
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recruitment_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_undecided BOOLEAN NOT NULL DEFAULT false;

-- 2. 프로젝트 일정 후보 날짜 (관리자 설정)
CREATE TABLE public.project_schedule_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, date)
);

CREATE INDEX idx_project_schedule_dates_project ON public.project_schedule_dates(project_id);

-- 3. 참여자 가능 시간대 투표
CREATE TABLE public.project_availability_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date_id UUID NOT NULL REFERENCES public.project_schedule_dates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'maybe')),
  time_slots JSONB NOT NULL DEFAULT '[]',
  note TEXT,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_date_id, user_id)
);

CREATE INDEX idx_availability_votes_schedule_date ON public.project_availability_votes(schedule_date_id);
CREATE INDEX idx_availability_votes_user ON public.project_availability_votes(user_id);

-- RLS
ALTER TABLE public.project_schedule_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_availability_votes ENABLE ROW LEVEL SECURITY;

-- project_schedule_dates: 누구나 조회, 프로젝트 소유자만 CUD
CREATE POLICY "schedule_dates_select" ON public.project_schedule_dates
  FOR SELECT USING (true);

CREATE POLICY "schedule_dates_insert" ON public.project_schedule_dates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_schedule_dates.project_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "schedule_dates_update" ON public.project_schedule_dates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_schedule_dates.project_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "schedule_dates_delete" ON public.project_schedule_dates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_schedule_dates.project_id
        AND p.owner_id = auth.uid()
    )
  );

-- project_availability_votes: 본인 or 프로젝트 소유자
CREATE POLICY "availability_votes_select" ON public.project_availability_votes
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_schedule_dates sd
      JOIN public.projects p ON p.id = sd.project_id
      WHERE sd.id = project_availability_votes.schedule_date_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "availability_votes_insert" ON public.project_availability_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_schedule_dates sd
      JOIN public.projects p ON p.id = sd.project_id
      WHERE sd.id = project_availability_votes.schedule_date_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "availability_votes_update" ON public.project_availability_votes
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_schedule_dates sd
      JOIN public.projects p ON p.id = sd.project_id
      WHERE sd.id = project_availability_votes.schedule_date_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "availability_votes_delete" ON public.project_availability_votes
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_schedule_dates sd
      JOIN public.projects p ON p.id = sd.project_id
      WHERE sd.id = project_availability_votes.schedule_date_id
        AND p.owner_id = auth.uid()
    )
  );
