-- 026_project_managers.sql
-- 프로젝트별 읽기전용 '프로젝트 관리자' 역할.
-- 운영진(admin/owner)이 특정 멤버를 특정 프로젝트의 관리자로 지정하면,
-- 그 멤버가 해당 프로젝트의 지원자현황 + 일정을 '읽기전용'으로 조회할 수 있다.
-- (생성/수정/상태변경/삭제 불가, 담당 프로젝트 외 접근 불가)
--
-- 전부 additive: 기존 테이블/정책/함수 수정·삭제 없음. SELECT 정책만 신규 추가.

BEGIN;

-- ============================================================
-- 1) 지정 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_managers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_managers_user_id_idx    ON public.project_managers(user_id);
CREATE INDEX IF NOT EXISTS project_managers_project_id_idx ON public.project_managers(project_id);

ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2) 헬퍼: 현재 사용자가 해당 프로젝트의 관리자인지
-- ============================================================
-- RLS 정책 표현식에서 호출되므로 SECURITY DEFINER + search_path 고정.
CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_managers
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- 3) RLS: project_managers 테이블
-- ============================================================
-- 운영진(admin/owner)은 지정/해제/조회 전체 관리.
CREATE POLICY "project_managers_admin_all" ON public.project_managers
  FOR ALL
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- 본인은 자신의 지정 내역만 조회(내 담당 프로젝트 목록용).
CREATE POLICY "project_managers_self_select" ON public.project_managers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 4) RLS 추가(SELECT 전용): 프로젝트 관리자가 담당 프로젝트를 읽도록
--    기존 정책은 그대로 두고 OR 로 합쳐지는 신규 정책만 추가.
-- ============================================================

-- projects: visibility(admin/private 등) 무관하게 담당 프로젝트는 조회 가능.
CREATE POLICY "projects_manager_select" ON public.projects
  FOR SELECT TO authenticated
  USING (public.current_user_is_active() AND public.is_project_manager(id));

-- project_applications: 담당 프로젝트의 지원자현황 조회.
CREATE POLICY "applications_manager_select" ON public.project_applications
  FOR SELECT TO authenticated
  USING (public.current_user_is_active() AND public.is_project_manager(project_id));

-- schedule_votes: 담당 프로젝트의 일정 후보에 달린 투표만 조회(집계용).
-- (schedule_dates 는 이미 활성 멤버 SELECT 가능, crew_members 도 동일 → 별도 정책 불필요)
CREATE POLICY "votes_manager_select" ON public.schedule_votes
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_active() AND EXISTS (
      SELECT 1 FROM public.schedule_dates sd
      WHERE sd.id = schedule_votes.schedule_date_id
        AND public.is_project_manager(sd.project_id)
    )
  );

COMMIT;
