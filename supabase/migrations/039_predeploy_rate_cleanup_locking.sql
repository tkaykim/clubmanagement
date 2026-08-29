-- OneShot Crew — 동시 지원 요청의 stale rate-limit 정리 교착 방지

BEGIN;

CREATE OR REPLACE FUNCTION public.prune_stale_application_submission_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  WITH stale AS (
    SELECT candidate.id
    FROM public.application_submission_attempts candidate
    WHERE candidate.created_at < clock_timestamp() - interval '1 day'
    ORDER BY candidate.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 100
  )
  DELETE FROM public.application_submission_attempts attempt
  USING stale
  WHERE attempt.id = stale.id;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_stale_application_submission_attempts()
  FROM PUBLIC, anon, authenticated;

COMMIT;
