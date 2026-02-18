-- =============================================================================
-- 동아리 플랫폼 DB 스키마 (참고용)
-- 실제 마이그레이션·데이터 삽입은 추후 Supabase 연동 시 진행합니다.
-- =============================================================================

-- 1. Users (Supabase Auth 연동)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Clubs (동아리)
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '일반',
  max_members INTEGER DEFAULT 50,
  is_recruiting BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recruitment_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Members (동아리 회원)
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 4. Schedules (일정)
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Schedule RSVPs (일정 참석 여부)
CREATE TABLE public.schedule_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('attending', 'declined', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, user_id)
);

-- 6. Projects (프로젝트)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled', 'scheduled', 'ongoing', 'ended')),
  starts_at DATE,
  ends_at DATE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  visibility TEXT NOT NULL DEFAULT 'club_only'
    CHECK (visibility IN ('club_only', 'private', 'public')),
  project_type TEXT NOT NULL DEFAULT 'free'
    CHECK (project_type IN ('paid', 'free', 'participation_fee')),
  poster_url TEXT,
  recruitment_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Project Members (프로젝트 참여 인원)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 8. Tasks (프로젝트 작업)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assignee_id UUID REFERENCES public.users(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_members_club ON public.members(club_id);
CREATE INDEX idx_members_user ON public.members(user_id);
CREATE INDEX idx_schedules_club ON public.schedules(club_id);
CREATE INDEX idx_projects_club ON public.projects(club_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);

-- RLS 등 정책은 supabase/migrations/ 참고. 공개(public) 프로젝트는 비로그인 조회 가능하도록 설정.
