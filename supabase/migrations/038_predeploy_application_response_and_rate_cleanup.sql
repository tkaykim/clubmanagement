-- OneShot Crew — 지원 생성 결과의 원자 반환과 rate-limit 상태의 기한 정리

BEGIN;

CREATE OR REPLACE FUNCTION public.service_submit_project_application_v2(
  p_application JSONB,
  p_votes JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  application_id UUID;
  application_result JSONB;
BEGIN
  application_id := public.service_submit_project_application(p_application, p_votes);

  SELECT to_jsonb(application)
  INTO application_result
  FROM public.project_applications application
  WHERE application.id = application_id;

  IF application_result IS NULL THEN
    RAISE EXCEPTION 'created application could not be returned' USING ERRCODE = 'P0002';
  END IF;

  RETURN application_result;
END;
$$;

REVOKE ALL ON FUNCTION public.service_submit_project_application_v2(JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_submit_project_application_v2(JSONB, JSONB)
  TO service_role;

CREATE INDEX IF NOT EXISTS idx_application_submission_attempts_created_at
  ON public.application_submission_attempts(created_at);

CREATE OR REPLACE FUNCTION public.prune_stale_application_submission_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM public.application_submission_attempts attempt
  WHERE attempt.id IN (
    SELECT stale.id
    FROM public.application_submission_attempts stale
    WHERE stale.created_at < clock_timestamp() - interval '1 day'
    ORDER BY stale.created_at
    LIMIT 100
  );
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_stale_application_submission_attempts()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prune_stale_application_attempts
  ON public.application_submission_attempts;
CREATE TRIGGER prune_stale_application_attempts
  AFTER INSERT OR UPDATE ON public.application_submission_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.prune_stale_application_submission_attempts();

COMMIT;
