-- OneShot Crew — 후보 일정과 확정 일정 분리
-- 기존 일정은 후보로 유지하고, 운영진이 명시적으로 확정한 날짜만 캘린더에 기본 노출한다.

ALTER TABLE public.schedule_dates
  ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.schedule_dates
  DROP CONSTRAINT IF EXISTS schedule_dates_confirmation_consistency;

ALTER TABLE public.schedule_dates
  ADD CONSTRAINT schedule_dates_confirmation_consistency CHECK (
    (is_confirmed = FALSE AND confirmed_at IS NULL AND confirmed_by IS NULL)
    OR
    (is_confirmed = TRUE AND confirmed_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_schedule_dates_confirmed_date
  ON public.schedule_dates(date)
  WHERE is_confirmed = TRUE;
