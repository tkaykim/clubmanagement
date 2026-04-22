-- =============================================================
-- 009_auth_ssot_crew_members.sql
-- 권한 판정 SSOT 를 crew_members.role 로 통일.
--
-- 과거 users.role 과 crew_members.role 이 따로 있어서
--   - 미들웨어 / requireAdmin 은 users.role 를 참조
--   - 레이아웃 / 멤버 페이지 UI 는 crew_members.role 를 참조
-- 양쪽이 어긋나면 "admin 메뉴는 보이는데 승인 버튼은 실패" 현상이 발생.
--
-- 변경:
--   1) SECURITY DEFINER 헬퍼 is_admin_or_owner(uuid), is_owner(uuid) 추가
--      — RLS 정책에서 공통으로 참조, 재귀 안전.
--   2) 9개 RLS 정책을 users.role → is_admin_or_owner() / is_owner() 기반으로 재정의.
--   3) users.role 컬럼 DROP. 권한은 이제 crew_members.role 단일 소스.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE user_id = uid AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crew_members
    WHERE user_id = uid AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_owner(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
CREATE POLICY announcements_admin_all ON public.announcements
  FOR ALL USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS crew_members_admin_all ON public.crew_members;
CREATE POLICY crew_members_admin_all ON public.crew_members
  FOR ALL USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS form_fields_admin_all ON public.form_fields;
CREATE POLICY form_fields_admin_all ON public.form_fields
  FOR ALL USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS payouts_admin_all ON public.payouts;
CREATE POLICY payouts_admin_all ON public.payouts
  FOR ALL USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS applications_admin_update ON public.project_applications;
CREATE POLICY applications_admin_update ON public.project_applications
  FOR UPDATE USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS projects_admin_insert ON public.projects;
CREATE POLICY projects_admin_insert ON public.projects
  FOR INSERT WITH CHECK (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS projects_admin_update ON public.projects;
CREATE POLICY projects_admin_update ON public.projects
  FOR UPDATE USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS projects_owner_delete ON public.projects;
CREATE POLICY projects_owner_delete ON public.projects
  FOR DELETE USING (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS schedule_dates_admin_all ON public.schedule_dates;
CREATE POLICY schedule_dates_admin_all ON public.schedule_dates
  FOR ALL USING (public.is_admin_or_owner(auth.uid()));

ALTER TABLE public.users
  DROP COLUMN IF EXISTS role;

COMMIT;
