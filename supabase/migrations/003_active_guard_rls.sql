-- 003_active_guard_rls.sql
-- OneShot Crew — 비활성 멤버(is_active=false) 데이터 접근 차단
-- Run after 002_extend_schema.sql
--
-- 문제: 기존 RLS 정책이 auth.role() = 'authenticated' 만 체크하여
--       승인 대기 중인 멤버도 팀 데이터 전체를 조회할 수 있음.
-- 해결: 핵심 테이블 SELECT 정책에 is_active = true 조건 추가.
--       본인 crew_members 레코드는 ActiveGuard 동작을 위해 항상 조회 허용.
--
-- 주의: crew_members SELECT 정책 안에서 crew_members 를 다시 조회하면
--       PostgreSQL 이 "infinite recursion detected in policy" 오류(42P17)를
--       뱉으며 500 응답으로 이어진다. 이를 피하려고 SECURITY DEFINER 헬퍼
--       함수로 우회한다.

-- ============================================================
-- RLS 우회용 헬퍼 함수 (SECURITY DEFINER → 정책 평가에서 RLS 루프 차단)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner','admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_active_admin() TO authenticated;

-- ============================================================
-- crew_members: 본인 레코드는 항상, 타인은 활성 멤버만
-- ============================================================

DROP POLICY IF EXISTS "crew_members_auth_select" ON crew_members;
CREATE POLICY "crew_members_auth_select" ON crew_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_is_active()
  );

-- ============================================================
-- projects: 활성 멤버만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "projects_auth_select" ON projects;
CREATE POLICY "projects_auth_select" ON projects
  FOR SELECT TO authenticated
  USING (public.current_user_is_active());

-- ============================================================
-- schedule_dates: 활성 멤버만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "schedule_dates_auth_select" ON schedule_dates;
CREATE POLICY "schedule_dates_auth_select" ON schedule_dates
  FOR SELECT TO authenticated
  USING (public.current_user_is_active());

-- ============================================================
-- schedule_votes: admin 용 SELECT (활성 admin 만)
-- ============================================================

DROP POLICY IF EXISTS "votes_admin_select" ON schedule_votes;
CREATE POLICY "votes_admin_select" ON schedule_votes
  FOR SELECT TO authenticated
  USING (public.current_user_is_active_admin());

-- ============================================================
-- project_applications: 활성 본인, 활성 admin
-- ============================================================

DROP POLICY IF EXISTS "applications_self_select" ON project_applications;
CREATE POLICY "applications_self_select" ON project_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.current_user_is_active());

DROP POLICY IF EXISTS "applications_admin_select" ON project_applications;
CREATE POLICY "applications_admin_select" ON project_applications
  FOR SELECT TO authenticated
  USING (public.current_user_is_active_admin());

-- ============================================================
-- announcements: 활성 멤버 + team scope 또는 approved 지원자
-- ============================================================

DROP POLICY IF EXISTS "announcements_member_select" ON announcements;
CREATE POLICY "announcements_member_select" ON announcements
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_active()
    AND (
      scope = 'team'
      OR EXISTS (
        SELECT 1 FROM project_applications pa
        WHERE pa.project_id = announcements.project_id
          AND pa.user_id = auth.uid()
          AND pa.status = 'approved'
      )
    )
  );

-- ============================================================
-- payouts: 활성 본인
-- ============================================================

DROP POLICY IF EXISTS "payouts_self_select" ON payouts;
CREATE POLICY "payouts_self_select" ON payouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.current_user_is_active());

-- ============================================================
-- availability_presets: 활성 본인
-- ============================================================

DROP POLICY IF EXISTS "presets_self_all" ON availability_presets;
CREATE POLICY "presets_self_all" ON availability_presets
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.current_user_is_active())
  WITH CHECK (user_id = auth.uid() AND public.current_user_is_active());
