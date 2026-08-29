-- OneShot Crew — 코드 배포 전 원자 쓰기·중복 방지·권한 보강

BEGIN;

-- 구버전 앱의 legacy 계좌 컬럼 변경 시각을 추적해 배포 겹침 구간의 마지막 쓰기를 보존한다.
ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS payout_legacy_updated_at TIMESTAMPTZ;

UPDATE public.crew_members
SET payout_legacy_updated_at = now()
WHERE payout_legacy_updated_at IS NULL
  AND (
    bank_code IS NOT NULL
    OR bank_name IS NOT NULL
    OR bank_account IS NOT NULL
    OR bank_holder IS NOT NULL
  );

INSERT INTO public.crew_member_payout_accounts (
  crew_member_id, bank_code, bank_name, bank_account, bank_holder, updated_at
)
SELECT
  id, bank_code, bank_name, bank_account, bank_holder, payout_legacy_updated_at
FROM public.crew_members
WHERE payout_legacy_updated_at IS NOT NULL
ON CONFLICT (crew_member_id) DO UPDATE SET
  bank_code = EXCLUDED.bank_code,
  bank_name = EXCLUDED.bank_name,
  bank_account = EXCLUDED.bank_account,
  bank_holder = EXCLUDED.bank_holder,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.mark_legacy_payout_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF ROW(NEW.bank_code, NEW.bank_name, NEW.bank_account, NEW.bank_holder)
     IS DISTINCT FROM
     ROW(OLD.bank_code, OLD.bank_name, OLD.bank_account, OLD.bank_holder) THEN
    NEW.payout_legacy_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_legacy_payout_updated_at ON public.crew_members;
CREATE TRIGGER set_legacy_payout_updated_at
  BEFORE UPDATE OF bank_code, bank_name, bank_account, bank_holder
  ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_legacy_payout_updated_at();

-- 외래키 검사와 관리자 캘린더 확정자 조회를 위한 부분 인덱스다.
CREATE INDEX IF NOT EXISTS idx_schedule_dates_confirmed_by
  ON public.schedule_dates(confirmed_by)
  WHERE confirmed_by IS NOT NULL;

-- auth.uid()를 문장당 한 번만 평가하도록 정산계좌 RLS를 최적화한다.
DROP POLICY IF EXISTS payout_accounts_select ON public.crew_member_payout_accounts;
CREATE POLICY payout_accounts_select ON public.crew_member_payout_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.id = crew_member_id
        AND (
          cm.user_id = (SELECT auth.uid())
          OR public.is_admin_or_owner((SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS payout_accounts_insert ON public.crew_member_payout_accounts;
CREATE POLICY payout_accounts_insert ON public.crew_member_payout_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.id = crew_member_id
        AND (
          cm.user_id = (SELECT auth.uid())
          OR public.is_admin_or_owner((SELECT auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS payout_accounts_update ON public.crew_member_payout_accounts;
CREATE POLICY payout_accounts_update ON public.crew_member_payout_accounts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.id = crew_member_id
        AND (
          cm.user_id = (SELECT auth.uid())
          OR public.is_admin_or_owner((SELECT auth.uid()))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.id = crew_member_id
        AND (
          cm.user_id = (SELECT auth.uid())
          OR public.is_admin_or_owner((SELECT auth.uid()))
        )
    )
  );

REVOKE ALL ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.update_project_with_schedule(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_project_with_schedule(UUID, JSONB, JSONB) TO authenticated;

-- 진행 중·승인된 게스트 지원은 프로젝트/이메일 기준 대소문자 무시 중복을 원자 차단한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.project_applications
    WHERE user_id IS NULL
      AND guest_email IS NOT NULL
      AND status IN ('pending', 'approved')
    GROUP BY project_id, lower(guest_email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate active guest applications must be reconciled before adding the unique index';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_applications_guest_email_active_unique
  ON public.project_applications(project_id, lower(guest_email))
  WHERE user_id IS NULL
    AND guest_email IS NOT NULL
    AND status IN ('pending', 'approved');

-- 요청마다 행을 추가하지 않고 프로젝트/IP별 한 행의 윈도우와 횟수만 갱신한다.
ALTER TABLE public.application_submission_attempts
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.application_submission_attempts
    GROUP BY project_id, fingerprint
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate rate-limit rows must be reconciled before adding the unique index';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_application_submission_attempts_identity
  ON public.application_submission_attempts(project_id, fingerprint);

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
  rate_row public.application_submission_attempts%ROWTYPE;
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

  SELECT * INTO rate_row
  FROM public.application_submission_attempts
  WHERE project_id = p_project_id AND fingerprint = p_fingerprint
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.application_submission_attempts(
      project_id, fingerprint, attempt_count, created_at
    ) VALUES (p_project_id, p_fingerprint, 1, now());
    RETURN TRUE;
  END IF;

  IF rate_row.created_at < clock_timestamp() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.application_submission_attempts
    SET attempt_count = 1, created_at = now()
    WHERE id = rate_row.id;
    RETURN TRUE;
  END IF;

  IF rate_row.attempt_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.application_submission_attempts
  SET attempt_count = attempt_count + 1
  WHERE id = rate_row.id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_application_rate_limit(UUID, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_application_rate_limit(UUID, TEXT, INTEGER, INTEGER)
  TO service_role;

-- 지원서와 인증 사용자 일정 응답을 한 트랜잭션에서 생성한다.
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
BEGIN
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

-- 본인 지원서 허용 필드와 일정 응답도 한 트랜잭션에서 수정한다.
CREATE OR REPLACE FUNCTION public.service_update_project_application(
  p_application_id UUID,
  p_user_id UUID,
  p_updates JSONB DEFAULT '{}'::JSONB,
  p_votes JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  application_project_id UUID;
BEGIN
  SELECT project_id INTO application_project_id
  FROM public.project_applications
  WHERE id = p_application_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found' USING ERRCODE = 'P0002';
  END IF;

  IF jsonb_typeof(COALESCE(p_votes, '{}'::JSONB)) <> 'object' THEN
    RAISE EXCEPTION 'p_votes must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
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

  UPDATE public.project_applications application
  SET motivation = CASE WHEN p_updates ? 'motivation' THEN p_updates->>'motivation' ELSE application.motivation END,
      fee_agreement = CASE WHEN p_updates ? 'fee_agreement' THEN p_updates->>'fee_agreement' ELSE application.fee_agreement END,
      answers_note = CASE WHEN p_updates ? 'answers_note' THEN p_updates->>'answers_note' ELSE application.answers_note END,
      answers = CASE WHEN p_updates ? 'answers' THEN p_updates->'answers' ELSE application.answers END,
      created_at = CASE WHEN p_updates ? 'created_at' THEN (p_updates->>'created_at')::TIMESTAMPTZ ELSE application.created_at END
  WHERE application.id = p_application_id;

  IF p_votes <> '{}'::JSONB THEN
    INSERT INTO public.schedule_votes (
      schedule_date_id, user_id, status, time_slots, note, updated_by
    )
    SELECT
      vote.key::UUID,
      p_user_id,
      vote.value->>'status',
      COALESCE(vote.value->'time_slots', '[]'::JSONB),
      NULLIF(vote.value->>'note', ''),
      p_user_id
    FROM jsonb_each(p_votes) AS vote(key, value)
    ON CONFLICT (schedule_date_id, user_id) DO UPDATE SET
      status = EXCLUDED.status,
      time_slots = EXCLUDED.time_slots,
      note = EXCLUDED.note,
      updated_by = EXCLUDED.updated_by,
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.service_update_project_application(UUID, UUID, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_update_project_application(UUID, UUID, JSONB, JSONB)
  TO service_role;

-- 기본 프로필과 별도 정산계좌 행을 한 트랜잭션에서 저장한다.
CREATE OR REPLACE FUNCTION public.service_update_member_profile_and_payout(
  p_member_id UUID,
  p_profile_updates JSONB DEFAULT '{}'::JSONB,
  p_payout_updates JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.crew_members member
  SET name = CASE WHEN p_profile_updates ? 'name' THEN p_profile_updates->>'name' ELSE member.name END,
      stage_name = CASE WHEN p_profile_updates ? 'stage_name' THEN p_profile_updates->>'stage_name' ELSE member.stage_name END,
      phone = CASE WHEN p_profile_updates ? 'phone' THEN p_profile_updates->>'phone' ELSE member.phone END,
      gender = CASE WHEN p_profile_updates ? 'gender' THEN p_profile_updates->>'gender' ELSE member.gender END,
      birth_date = CASE WHEN p_profile_updates ? 'birth_date' THEN (p_profile_updates->>'birth_date')::DATE ELSE member.birth_date END,
      youtube_url = CASE WHEN p_profile_updates ? 'youtube_url' THEN p_profile_updates->>'youtube_url' ELSE member.youtube_url END,
      instagram_handle = CASE WHEN p_profile_updates ? 'instagram_handle' THEN p_profile_updates->>'instagram_handle' ELSE member.instagram_handle END,
      height_cm = CASE WHEN p_profile_updates ? 'height_cm' THEN (p_profile_updates->>'height_cm')::SMALLINT ELSE member.height_cm END,
      top_size = CASE WHEN p_profile_updates ? 'top_size' THEN p_profile_updates->>'top_size' ELSE member.top_size END,
      bottom_size = CASE WHEN p_profile_updates ? 'bottom_size' THEN p_profile_updates->>'bottom_size' ELSE member.bottom_size END,
      shoe_size = CASE WHEN p_profile_updates ? 'shoe_size' THEN p_profile_updates->>'shoe_size' ELSE member.shoe_size END,
      wardrobe_notes = CASE WHEN p_profile_updates ? 'wardrobe_notes' THEN p_profile_updates->>'wardrobe_notes' ELSE member.wardrobe_notes END,
      profile_image_url = CASE WHEN p_profile_updates ? 'profile_image_url' THEN p_profile_updates->>'profile_image_url' ELSE member.profile_image_url END,
      public_bio = CASE WHEN p_profile_updates ? 'public_bio' THEN p_profile_updates->>'public_bio' ELSE member.public_bio END,
      is_public = CASE WHEN p_profile_updates ? 'is_public' THEN (p_profile_updates->>'is_public')::BOOLEAN ELSE member.is_public END,
      specialties = CASE
        WHEN p_profile_updates ? 'specialties' AND jsonb_typeof(p_profile_updates->'specialties') = 'null' THEN NULL
        WHEN p_profile_updates ? 'specialties' THEN ARRAY(
          SELECT jsonb_array_elements_text(p_profile_updates->'specialties')
        )
        ELSE member.specialties
      END
  WHERE member.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_payout_updates IS NOT NULL THEN
    INSERT INTO public.crew_member_payout_accounts (
      crew_member_id, bank_code, bank_name, bank_account, bank_holder, updated_at
    ) VALUES (
      p_member_id,
      p_payout_updates->>'bank_code',
      p_payout_updates->>'bank_name',
      p_payout_updates->>'bank_account',
      p_payout_updates->>'bank_holder',
      now()
    )
    ON CONFLICT (crew_member_id) DO UPDATE SET
      bank_code = EXCLUDED.bank_code,
      bank_name = EXCLUDED.bank_name,
      bank_account = EXCLUDED.bank_account,
      bank_holder = EXCLUDED.bank_holder,
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.service_update_member_profile_and_payout(UUID, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_update_member_profile_and_payout(UUID, JSONB, JSONB)
  TO service_role;

COMMIT;
