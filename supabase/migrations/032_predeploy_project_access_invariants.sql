-- OneShot Crew — 프로젝트 열람 정책과 지원 생성 권한의 단일 판정 함수

BEGIN;

CREATE OR REPLACE FUNCTION public.user_can_access_project(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects project
    JOIN public.crew_members member
      ON member.user_id = p_user_id
     AND COALESCE(member.is_active, true) = true
    WHERE project.id = p_project_id
      AND (
        project.visibility = 'public'
        OR (project.visibility = 'admin' AND member.role IN ('owner', 'admin'))
        OR (
          project.visibility = 'contract'
          AND (member.role IN ('owner', 'admin') OR member.contract_type = 'contract')
        )
        OR (
          project.visibility = 'private'
          AND (project.owner_id = p_user_id OR member.role = 'owner')
        )
        OR EXISTS (
          SELECT 1
          FROM public.project_managers manager
          WHERE manager.project_id = project.id
            AND manager.user_id = p_user_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_access_project(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_project(UUID, UUID)
  TO authenticated, service_role;

DROP POLICY IF EXISTS projects_auth_select ON public.projects;
DROP POLICY IF EXISTS projects_manager_select ON public.projects;
DROP POLICY IF EXISTS projects_access_select ON public.projects;
CREATE POLICY projects_access_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.user_can_access_project((SELECT auth.uid()), id));

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

  IF application_user_id IS NOT NULL
     AND NOT public.user_can_access_project(application_user_id, application_project_id) THEN
    RAISE EXCEPTION 'member cannot access project' USING ERRCODE = '42501';
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
