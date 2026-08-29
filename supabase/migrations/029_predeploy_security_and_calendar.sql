-- OneShot Crew — 코드 배포 전 호환 가능한 보안·일정 인프라

BEGIN;

-- 호출자의 projects RLS가 뷰에도 적용되도록 강제한다.
ALTER VIEW public.projects_with_range SET (security_invoker = true);

-- 게스트 지원 연결은 로그인한 본인의 이메일까지 일치할 때만 허용한다.
CREATE OR REPLACE FUNCTION public.link_guest_applications(
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  matched INTEGER;
  caller_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'authenticated user mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'authenticated email required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.project_applications
  SET user_id = p_user_id,
      guest_name = NULL,
      guest_phone = NULL
  WHERE user_id IS NULL
    AND guest_name = p_name
    AND guest_phone = p_phone
    AND lower(guest_email) = lower(caller_email);

  GET DIAGNOSTICS matched = ROW_COUNT;
  RETURN matched;
END;
$$;

REVOKE ALL ON FUNCTION public.link_guest_applications(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_guest_applications(UUID, TEXT, TEXT) TO authenticated;

-- 서버가 공개 지원 요청을 프로젝트·클라이언트 지문별로 원자적으로 제한한다.
CREATE TABLE IF NOT EXISTS public.application_submission_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL CHECK (length(fingerprint) = 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_submission_attempts_window
  ON public.application_submission_attempts(project_id, fingerprint, created_at DESC);

ALTER TABLE public.application_submission_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.application_submission_attempts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_application_rate_limit(
  p_project_id UUID,
  p_fingerprint TEXT,
  p_limit INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  IF p_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_limit < 1 OR p_limit > 100
     OR p_window_seconds < 10 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit arguments' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_project_id::text || ':' || p_fingerprint, 0)
  );

  SELECT count(*) INTO attempt_count
  FROM public.application_submission_attempts
  WHERE project_id = p_project_id
    AND fingerprint = p_fingerprint
    AND created_at >= clock_timestamp() - make_interval(secs => p_window_seconds);

  IF attempt_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.application_submission_attempts(project_id, fingerprint)
  VALUES (p_project_id, p_fingerprint);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_application_rate_limit(UUID, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_application_rate_limit(UUID, TEXT, INTEGER, INTEGER)
  TO service_role;

-- 프로젝트 필드와 일정 후보 교체를 한 트랜잭션으로 묶는다.
CREATE OR REPLACE FUNCTION public.update_project_with_schedule(
  p_project_id UUID,
  p_project_updates JSONB,
  p_dates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_owner(auth.uid()) THEN
    RAISE EXCEPTION 'admin permission required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  UPDATE public.projects project
  SET title = CASE WHEN p_project_updates ? 'title' THEN p_project_updates->>'title' ELSE project.title END,
      description = CASE WHEN p_project_updates ? 'description' THEN p_project_updates->>'description' ELSE project.description END,
      type = CASE WHEN p_project_updates ? 'type' THEN p_project_updates->>'type' ELSE project.type END,
      visibility = CASE WHEN p_project_updates ? 'visibility' THEN p_project_updates->>'visibility' ELSE project.visibility END,
      venue = CASE WHEN p_project_updates ? 'venue' THEN p_project_updates->>'venue' ELSE project.venue END,
      address = CASE WHEN p_project_updates ? 'address' THEN p_project_updates->>'address' ELSE project.address END,
      pay_type = CASE WHEN p_project_updates ? 'pay_type' THEN p_project_updates->>'pay_type' ELSE project.pay_type END,
      fee = CASE WHEN p_project_updates ? 'fee' THEN (p_project_updates->>'fee')::INTEGER ELSE project.fee END,
      max_participants = CASE WHEN p_project_updates ? 'max_participants' THEN (p_project_updates->>'max_participants')::INTEGER ELSE project.max_participants END,
      recruitment_start_at = CASE WHEN p_project_updates ? 'recruitment_start_at' THEN (p_project_updates->>'recruitment_start_at')::TIMESTAMPTZ ELSE project.recruitment_start_at END,
      recruitment_end_at = CASE WHEN p_project_updates ? 'recruitment_end_at' THEN (p_project_updates->>'recruitment_end_at')::TIMESTAMPTZ ELSE project.recruitment_end_at END,
      status = CASE WHEN p_project_updates ? 'status' THEN p_project_updates->>'status' ELSE project.status END,
      poster_url = CASE WHEN p_project_updates ? 'poster_url' THEN p_project_updates->>'poster_url' ELSE project.poster_url END,
      updated_at = now()
  WHERE project.id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.replace_project_schedule_dates(p_project_id, p_dates);
END;
$$;

REVOKE ALL ON FUNCTION public.update_project_with_schedule(UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_with_schedule(UUID, JSONB, JSONB) TO authenticated;

-- 완료 프로젝트는 과거 확정 이력으로 간주한다.
UPDATE public.schedule_dates schedule
SET is_confirmed = TRUE,
    confirmed_at = COALESCE(schedule.confirmed_at, now())
FROM public.projects project
WHERE project.id = schedule.project_id
  AND project.status = 'completed'
  AND schedule.is_confirmed = FALSE;

COMMIT;
