-- =============================================================
-- 007_project_pay_type.sql
-- projects.pay_type 컬럼 추가
--   pay  : 페이 있음 (출연료 지급)
--   fee  : 참가비 있음 (참가자가 지불)
--   free : 무료 행사
--   tbd  : 미정 (아직 결정 안 됨)
--
-- 기존 projects.fee(INTEGER) 는 금액만을 나타내는 용도로 의미 단일화.
-- 과거 관례상 음수로 "참가비" 를 표현했던 값은 pay_type='fee' 로 옮기고
-- fee 값 자체는 ABS() 로 양수화한다.
-- =============================================================

BEGIN;

-- 1) 컬럼 추가 (CHECK 제약 포함)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pay_type TEXT NOT NULL DEFAULT 'free'
    CHECK (pay_type IN ('pay', 'fee', 'free', 'tbd'));

-- 2) 기존 데이터 백필: fee 부호로 유형 추정
UPDATE public.projects
SET pay_type =
  CASE
    WHEN fee > 0 THEN 'pay'
    WHEN fee < 0 THEN 'fee'
    ELSE 'free'
  END
WHERE pay_type = 'free'; -- 기본값인 행만 (이미 수동 지정된 값은 보존)

-- 3) fee 값 절대값 정규화 (부호는 pay_type 가 담당)
UPDATE public.projects
SET fee = ABS(fee)
WHERE fee < 0;

-- 4) projects_with_range 뷰 재생성 — p.* 순서 변경 대응
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
