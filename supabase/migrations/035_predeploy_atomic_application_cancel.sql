-- OneShot Crew — 본인 지원 취소와 해당 일정 투표 삭제를 한 트랜잭션으로 처리

BEGIN;

CREATE OR REPLACE FUNCTION public.service_cancel_project_application(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  application_row RECORD;
  deleted_application_id UUID;
BEGIN
  SELECT id, status
  INTO application_row
  FROM public.project_applications
  WHERE project_id = p_project_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found' USING ERRCODE = 'P0002';
  END IF;

  IF application_row.status = 'approved' THEN
    RAISE EXCEPTION 'approved application cannot be cancelled' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.schedule_votes vote
  USING public.schedule_dates schedule
  WHERE vote.schedule_date_id = schedule.id
    AND schedule.project_id = p_project_id
    AND vote.user_id = p_user_id;

  DELETE FROM public.project_applications
  WHERE id = application_row.id
    AND project_id = p_project_id
    AND user_id = p_user_id
  RETURNING id INTO deleted_application_id;

  IF deleted_application_id IS NULL THEN
    RAISE EXCEPTION 'application delete failed' USING ERRCODE = 'P0002';
  END IF;

  RETURN deleted_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.service_cancel_project_application(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_cancel_project_application(UUID, UUID)
  TO service_role;

COMMIT;
