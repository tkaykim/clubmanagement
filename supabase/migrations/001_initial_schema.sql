-- Club Management Platform - Initial Schema
-- 동아리 관리 플랫폼 데이터베이스 스키마

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
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled')),
  starts_at DATE,
  ends_at DATE,
  created_by UUID NOT NULL REFERENCES public.users(id),
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

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users: 자신의 프로필 읽기/수정
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Clubs: 모든 동아리 조회 가능, 생성/수정은 인증 사용자
CREATE POLICY "clubs_read_all" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "clubs_insert_auth" ON public.clubs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "clubs_update_owner" ON public.clubs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "clubs_delete_owner" ON public.clubs FOR DELETE USING (auth.uid() = owner_id);

-- Members: 동아리 멤버 조회, 가입 신청, 관리
CREATE POLICY "members_read_club" ON public.members FOR SELECT USING (true);
CREATE POLICY "members_insert_self" ON public.members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_update_admin" ON public.members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = members.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);
CREATE POLICY "members_delete_admin" ON public.members FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = members.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);

-- Schedules: 동아리 멤버만 조회/생성
CREATE POLICY "schedules_read_member" ON public.schedules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = schedules.club_id AND m.user_id = auth.uid() AND m.status = 'approved')
);
CREATE POLICY "schedules_insert_member" ON public.schedules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = schedules.club_id AND m.user_id = auth.uid() AND m.status = 'approved')
);

-- Schedule RSVPs
CREATE POLICY "rsvps_read_member" ON public.schedule_rsvps FOR SELECT USING (true);
CREATE POLICY "rsvps_insert_self" ON public.schedule_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rsvps_update_self" ON public.schedule_rsvps FOR UPDATE USING (auth.uid() = user_id);

-- Projects: 동아리 멤버만
CREATE POLICY "projects_read_member" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = projects.club_id AND m.user_id = auth.uid() AND m.status = 'approved')
);
CREATE POLICY "projects_insert_admin" ON public.projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = projects.club_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin') AND m.status = 'approved')
);

-- Project Members
CREATE POLICY "pm_read_all" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "pm_insert_admin" ON public.project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.members m ON m.club_id = p.club_id
    WHERE p.id = project_members.project_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
  )
);

-- Tasks
CREATE POLICY "tasks_read_member" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert_member" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "tasks_update_assignee" ON public.tasks FOR UPDATE USING (
  assignee_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role = 'lead'
  )
);
