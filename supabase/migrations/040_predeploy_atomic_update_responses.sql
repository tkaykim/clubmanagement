-- OneShot Crew — 지원 수정과 프로필 저장 결과를 커밋과 같은 트랜잭션에서 반환

BEGIN;

CREATE OR REPLACE FUNCTION public.service_update_project_application_v2(
  p_application_id UUID,
  p_user_id UUID,
  p_updates JSONB DEFAULT '{}'::JSONB,
  p_votes JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  application_result JSONB;
BEGIN
  PERFORM public.service_update_project_application(
    p_application_id,
    p_user_id,
    p_updates,
    p_votes
  );

  SELECT to_jsonb(application)
  INTO application_result
  FROM public.project_applications application
  WHERE application.id = p_application_id
    AND application.user_id = p_user_id;

  IF application_result IS NULL THEN
    RAISE EXCEPTION 'updated application could not be returned' USING ERRCODE = 'P0002';
  END IF;

  RETURN application_result;
END;
$$;

REVOKE ALL ON FUNCTION public.service_update_project_application_v2(UUID, UUID, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_update_project_application_v2(UUID, UUID, JSONB, JSONB)
  TO service_role;

CREATE OR REPLACE FUNCTION public.service_update_member_profile_and_payout_v2(
  p_member_id UUID,
  p_profile_updates JSONB DEFAULT '{}'::JSONB,
  p_payout_updates JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.service_update_member_profile_and_payout(
    p_member_id,
    p_profile_updates,
    p_payout_updates
  );
  RETURN p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.service_update_member_profile_and_payout_v2(UUID, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_update_member_profile_and_payout_v2(UUID, JSONB, JSONB)
  TO service_role;

COMMIT;
