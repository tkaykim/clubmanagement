-- OneShot Crew — 공개 지원, 정산정보, 일정 교체 경로 보안/무결성 강화

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crew_members
    WHERE user_id = uid
      AND is_active = TRUE
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crew_members
    WHERE user_id = uid
      AND is_active = TRUE
      AND role = 'owner'
  );
$$;

CREATE TABLE IF NOT EXISTS public.crew_member_payout_accounts (
  crew_member_id UUID PRIMARY KEY REFERENCES public.crew_members(id) ON DELETE CASCADE,
  bank_code TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_holder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.crew_member_payout_accounts (
  crew_member_id,
  bank_code,
  bank_name,
  bank_account,
  bank_holder
)
SELECT id, bank_code, bank_name, bank_account, bank_holder
FROM public.crew_members
WHERE bank_code IS NOT NULL
   OR bank_name IS NOT NULL
   OR bank_account IS NOT NULL
   OR bank_holder IS NOT NULL
ON CONFLICT (crew_member_id) DO UPDATE SET
  bank_code = EXCLUDED.bank_code,
  bank_name = EXCLUDED.bank_name,
  bank_account = EXCLUDED.bank_account,
  bank_holder = EXCLUDED.bank_holder,
  updated_at = now();

ALTER TABLE public.crew_member_payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payout_accounts_select ON public.crew_member_payout_accounts;
CREATE POLICY payout_accounts_select ON public.crew_member_payout_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.id = crew_member_id
        AND (cm.user_id = auth.uid() OR public.is_admin_or_owner(auth.uid()))
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
        AND (cm.user_id = auth.uid() OR public.is_admin_or_owner(auth.uid()))
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
        AND (cm.user_id = auth.uid() OR public.is_admin_or_owner(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.crew_members cm
      WHERE cm.id = crew_member_id
        AND (cm.user_id = auth.uid() OR public.is_admin_or_owner(auth.uid()))
    )
  );

REVOKE ALL ON TABLE public.crew_member_payout_accounts FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.crew_member_payout_accounts FROM authenticated;
GRANT SELECT, INSERT, UPDATE
  ON TABLE public.crew_member_payout_accounts TO authenticated;

CREATE OR REPLACE FUNCTION public.project_accepts_applications(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.status = 'recruiting'
      AND (p.recruitment_start_at IS NULL OR now() >= p.recruitment_start_at)
      AND (p.recruitment_end_at IS NULL OR now() < p.recruitment_end_at)
  );
$$;

REVOKE ALL ON FUNCTION public.project_accepts_applications(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_accepts_applications(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS applications_anyone_insert ON public.project_applications;
DROP POLICY IF EXISTS applications_anon_insert ON public.project_applications;
CREATE POLICY applications_anon_insert ON public.project_applications
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND status = 'pending'
    AND public.project_accepts_applications(project_id)
  );

DROP POLICY IF EXISTS applications_authenticated_insert ON public.project_applications;
CREATE POLICY applications_authenticated_insert ON public.project_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND public.project_accepts_applications(project_id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_applications_member_unique
  ON public.project_applications(project_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.replace_project_schedule_dates(
  p_project_id UUID,
  p_dates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  incoming_row RECORD;
  inserted_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_owner(auth.uid()) THEN
    RAISE EXCEPTION 'admin permission required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'project not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_dates IS NULL OR jsonb_typeof(p_dates) <> 'array' THEN
    RAISE EXCEPTION 'p_dates must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_dates) AS entry(value)
    WHERE COALESCE(value->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
       OR COALESCE(value->>'kind', '') NOT IN ('event', 'practice')
  ) THEN
    RAISE EXCEPTION 'invalid schedule date payload' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  CREATE TEMP TABLE incoming_schedule_dates (
    ordinal BIGINT PRIMARY KEY,
    date DATE NOT NULL,
    kind TEXT NOT NULL,
    label TEXT,
    sort_order INTEGER NOT NULL,
    occurrence BIGINT NOT NULL,
    matched_id UUID
  ) ON COMMIT DROP;

  INSERT INTO incoming_schedule_dates (ordinal, date, kind, label, sort_order, occurrence)
  SELECT
    ord,
    (value->>'date')::date,
    value->>'kind',
    NULLIF(value->>'label', ''),
    COALESCE((value->>'sort_order')::integer, (ord - 1)::integer),
    row_number() OVER (
      PARTITION BY value->>'date', value->>'kind'
      ORDER BY ord
    )
  FROM jsonb_array_elements(p_dates) WITH ORDINALITY AS entry(value, ord);

  WITH existing_ranked AS (
    SELECT
      id,
      date,
      kind,
      row_number() OVER (
        PARTITION BY date, kind
        ORDER BY sort_order, id
      ) AS occurrence
    FROM public.schedule_dates
    WHERE project_id = p_project_id
  )
  UPDATE incoming_schedule_dates incoming
  SET matched_id = existing.id
  FROM existing_ranked existing
  WHERE incoming.date = existing.date
    AND incoming.kind = existing.kind
    AND incoming.occurrence = existing.occurrence;

  UPDATE public.schedule_dates existing
  SET label = incoming.label,
      sort_order = incoming.sort_order
  FROM incoming_schedule_dates incoming
  WHERE existing.id = incoming.matched_id;

  FOR incoming_row IN
    SELECT *
    FROM incoming_schedule_dates
    WHERE matched_id IS NULL
    ORDER BY ordinal
  LOOP
    INSERT INTO public.schedule_dates (project_id, date, label, kind, sort_order)
    VALUES (
      p_project_id,
      incoming_row.date,
      incoming_row.label,
      incoming_row.kind,
      incoming_row.sort_order
    )
    RETURNING id INTO inserted_id;

    UPDATE incoming_schedule_dates
    SET matched_id = inserted_id
    WHERE ordinal = incoming_row.ordinal;
  END LOOP;

  DELETE FROM public.schedule_dates existing
  WHERE existing.project_id = p_project_id
    AND NOT EXISTS (
      SELECT 1
      FROM incoming_schedule_dates incoming
      WHERE incoming.matched_id = existing.id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB) TO authenticated;
