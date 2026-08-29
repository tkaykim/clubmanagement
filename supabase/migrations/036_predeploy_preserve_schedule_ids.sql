-- OneShot Crew — 일정 종류만 바뀐 편집에서도 기존 ID와 투표를 보존

BEGIN;

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

  -- 같은 날짜에 양쪽 모두 미매칭 행이 하나뿐이면 종류 변경으로 보고 기존 ID를 재사용한다.
  WITH unique_incoming AS (
    SELECT date, min(ordinal) AS ordinal
    FROM incoming_schedule_dates
    WHERE matched_id IS NULL
    GROUP BY date
    HAVING count(*) = 1
  ),
  unique_existing AS (
    SELECT existing.date, min(existing.id) AS id
    FROM public.schedule_dates existing
    WHERE existing.project_id = p_project_id
      AND NOT EXISTS (
        SELECT 1
        FROM incoming_schedule_dates incoming
        WHERE incoming.matched_id = existing.id
      )
    GROUP BY existing.date
    HAVING count(*) = 1
  )
  UPDATE incoming_schedule_dates incoming
  SET matched_id = existing.id
  FROM unique_incoming candidate
  JOIN unique_existing existing ON existing.date = candidate.date
  WHERE incoming.ordinal = candidate.ordinal;

  UPDATE public.schedule_dates existing
  SET kind = incoming.kind,
      label = incoming.label,
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

REVOKE ALL ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB)
  TO authenticated;

COMMIT;
