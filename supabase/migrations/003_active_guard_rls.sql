-- 003_active_guard_rls.sql
-- OneShot Crew — 비활성 멤버(is_active=false) 데이터 접근 차단
-- Run after 002_extend_schema.sql
--
-- 문제: 기존 RLS 정책이 auth.role() = 'authenticated' 만 체크하여
--       승인 대기 중인 멤버도 팀 데이터 전체를 조회할 수 있음.
-- 해결: 핵심 테이블 SELECT 정책에 is_active = true 조건 추가.
--       본인 crew_members 레코드는 ActiveGuard 동작을 위해 항상 조회 허용.

-- ============================================================
-- crew_members: 본인 레코드는 항상 조회 가능,
--               타인 레코드는 is_active=true 멤버만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "crew_members_auth_select" ON crew_members;
CREATE POLICY "crew_members_auth_select" ON crew_members
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- 본인 레코드는 항상 조회 가능 (ActiveGuard 동작에 필요)
      user_id = auth.uid()
      OR
      -- 활성 멤버만 타인 레코드 조회 가능
      EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.user_id = auth.uid()
          AND cm.is_active = true
      )
    )
  );

-- ============================================================
-- projects: 활성 멤버만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "projects_auth_select" ON projects;
CREATE POLICY "projects_auth_select" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
    )
  );

-- ============================================================
-- schedule_dates: 활성 멤버만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "schedule_dates_auth_select" ON schedule_dates;
CREATE POLICY "schedule_dates_auth_select" ON schedule_dates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
    )
  );

-- ============================================================
-- schedule_votes: 본인 투표는 항상 접근 가능,
--                 admin SELECT 정책은 활성 멤버 조건 이미 포함
--                 (votes_self_all 정책의 user_id = auth.uid() 조건 유지)
-- ============================================================

DROP POLICY IF EXISTS "votes_admin_select" ON schedule_votes;
CREATE POLICY "votes_admin_select" ON schedule_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
        AND crew_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- project_applications: 활성 멤버 + 본인 레코드 조회,
--                        게스트 INSERT는 유지 (applications_anyone_insert)
-- ============================================================

DROP POLICY IF EXISTS "applications_self_select" ON project_applications;
CREATE POLICY "applications_self_select" ON project_applications
  FOR SELECT USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
    )
  );

DROP POLICY IF EXISTS "applications_admin_select" ON project_applications;
CREATE POLICY "applications_admin_select" ON project_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
        AND crew_members.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- announcements: 활성 멤버만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "announcements_member_select" ON announcements;
CREATE POLICY "announcements_member_select" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
    )
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
-- payouts: 활성 멤버 본인 레코드만 조회 가능
-- ============================================================

DROP POLICY IF EXISTS "payouts_self_select" ON payouts;
CREATE POLICY "payouts_self_select" ON payouts
  FOR SELECT USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
    )
  );

-- ============================================================
-- availability_presets: 활성 멤버 본인 레코드만 접근 가능
-- ============================================================

DROP POLICY IF EXISTS "presets_self_all" ON availability_presets;
CREATE POLICY "presets_self_all" ON availability_presets
  FOR ALL USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM crew_members
      WHERE crew_members.user_id = auth.uid()
        AND crew_members.is_active = true
    )
  );
