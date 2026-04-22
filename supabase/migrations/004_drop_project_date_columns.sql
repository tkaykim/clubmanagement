-- 004_drop_project_date_columns.sql
-- OneShot Crew — projects.start_date / end_date / schedule_undecided 제거
-- Run after 003_active_guard_rls.sql
--
-- 근거: 프로젝트 기간은 schedule_dates 의 MIN(date)/MAX(date) 로 파생 계산된다.
--       더 이상 프로젝트 레코드에 별도 컬럼을 둘 이유가 없고 UI 에서도 "기간으로
--       날짜 일괄 추가" 로 대체된다.
-- 파생 조회를 위한 projects_with_range VIEW 를 같이 제공한다.

BEGIN;

-- 1) 컬럼 제거 (존재할 때만)
ALTER TABLE public.projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE public.projects DROP COLUMN IF EXISTS end_date;
ALTER TABLE public.projects DROP COLUMN IF EXISTS schedule_undecided;

-- 2) 기간 파생 VIEW
CREATE OR REPLACE VIEW public.projects_with_range AS
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

-- VIEW 는 기본 SECURITY INVOKER (PG15+ 기본값) 로 호출자의 RLS 를 그대로 통과시킨다.
-- projects / schedule_dates 에 대한 기존 RLS 정책이 접근 제어를 담당하므로 별도 GRANT 는 필요 없다.
GRANT SELECT ON public.projects_with_range TO authenticated, anon;

COMMIT;
