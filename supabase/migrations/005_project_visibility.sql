-- 005_project_visibility.sql
-- OneShot Crew — 프로젝트 열람권한(visibility) 추가
-- Run after 004_drop_project_date_columns.sql
--
-- visibility:
--   public  — 전체공개 (활성 멤버 누구나)
--   admin   — 운영진만 공개 (owner/admin)
--   private — 비공개 (프로젝트 등록자 owner_id + 크루 owner 만)

BEGIN;

-- 1) 컬럼 추가
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'admin', 'private'));

CREATE INDEX IF NOT EXISTS idx_projects_visibility ON public.projects(visibility);

-- 2) 활성 owner 헬퍼 (SECURITY DEFINER 로 RLS 재귀 회피)
CREATE OR REPLACE FUNCTION public.current_user_is_active_owner()
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
      AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_active_owner() TO authenticated;

-- 3) projects SELECT 정책 교체 — 활성 + visibility 규칙
DROP POLICY IF EXISTS "projects_auth_select" ON public.projects;
CREATE POLICY "projects_auth_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_active() AND (
      visibility = 'public'
      OR (visibility = 'admin' AND public.current_user_is_active_admin())
      OR (visibility = 'private' AND (
        owner_id = auth.uid() OR public.current_user_is_active_owner()
      ))
    )
  );

-- 4) projects_with_range 뷰 재생성 (p.* 컬럼 목록 갱신 — visibility 포함)
-- CREATE OR REPLACE 는 컬럼 순서가 바뀔 경우 "cannot change name of view column" 오류가 난다.
-- projects 에 visibility 컬럼이 중간에 추가되면서 p.* 확장 순서가 변경되므로 DROP 후 재생성.
DROP VIEW IF EXISTS public.projects_with_range;
CREATE VIEW public.projects_with_range AS
SELECT
  p.*,
  r.start_date,
  r.end_date,
  (r.start_date IS NULL) AS schedule_undecided
FROM public.projects p
LEFT JOIN LATERAL (
  SELECT MIN(sd.date) AS start_date, MAX(sd.date) AS end_date
  FROM public.schedule_dates sd
  WHERE sd.project_id = p.id
) r ON TRUE;

GRANT SELECT ON public.projects_with_range TO authenticated, anon;

COMMIT;
