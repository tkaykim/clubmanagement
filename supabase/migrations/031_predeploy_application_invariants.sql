-- OneShot Crew — 지원 생성 트랜잭션 안에서 프로젝트 상태·모집기간·공개 범위를 재검증

BEGIN;

CREATE OR REPLACE FUNCTION public.service_submit_project_application(
  p_application JSONB,
  p_votes JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_application_id UUID;
  application_project_id UUID := (p_application->>'project_id')::UUID;
  application_user_id UUID := NULLIF(p_application->>'user_id', '')::UUID;
  project_row RECORD;
  transaction_now TIMESTAMPTZ := now();
BEGIN
  SELECT status, visibility, recruitment_start_at, recruitment_end_at
  INTO project_row
  FROM public.projects
  WHERE id = application_project_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;

  IF project_row.status <> 'recruiting'
     OR (project_row.recruitment_start_at IS NOT NULL AND transaction_now < project_row.recruitment_start_at)
     OR (project_row.recruitment_end_at IS NOT NULL AND transaction_now >= project_row.recruitment_end_at) THEN
    RAISE EXCEPTION 'project is not accepting applications' USING ERRCODE = 'P0001';
  END IF;

  IF application_user_id IS NULL AND project_row.visibility <> 'public' THEN
    RAISE EXCEPTION 'guest applications require a public project' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(COALESCE(p_votes, '{}'::JSONB)) <> 'object' THEN
    RAISE EXCEPTION 'p_votes must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF application_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(p_votes, '{}'::JSONB)) AS vote(schedule_date_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.schedule_dates schedule
      WHERE schedule.id = vote.schedule_date_id::UUID
        AND schedule.project_id = application_project_id
    )
  ) THEN
    RAISE EXCEPTION 'vote schedule does not belong to project' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.project_applications (
    project_id, user_id, guest_name, guest_email, guest_phone,
    motivation, fee_agreement, answers_note, answers, status
  ) VALUES (
    application_project_id,
    application_user_id,
    NULLIF(p_application->>'guest_name', ''),
    NULLIF(p_application->>'guest_email', ''),
    NULLIF(p_application->>'guest_phone', ''),
    NULLIF(p_application->>'motivation', ''),
    COALESCE(NULLIF(p_application->>'fee_agreement', ''), 'yes'),
    NULLIF(p_application->>'answers_note', ''),
    COALESCE(p_application->'answers', '{}'::JSONB),
    'pending'
  )
  RETURNING id INTO new_application_id;

  IF application_user_id IS NOT NULL AND p_votes <> '{}'::JSONB THEN
    INSERT INTO public.schedule_votes (
      schedule_date_id, user_id, status, time_slots, note, updated_by
    )
    SELECT
      vote.key::UUID,
      application_user_id,
      vote.value->>'status',
      COALESCE(vote.value->'time_slots', '[]'::JSONB),
      NULLIF(vote.value->>'note', ''),
      application_user_id
    FROM jsonb_each(p_votes) AS vote(key, value)
    ON CONFLICT (schedule_date_id, user_id) DO UPDATE SET
      status = EXCLUDED.status,
      time_slots = EXCLUDED.time_slots,
      note = EXCLUDED.note,
      updated_by = EXCLUDED.updated_by,
      updated_at = now();
  END IF;

  RETURN new_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.service_submit_project_application(JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_submit_project_application(JSONB, JSONB)
  TO service_role;

COMMIT;
