-- OneShot Crew — 036의 UUID 단일행 선택 집계를 PostgreSQL 지원 표현식으로 교정

BEGIN;

DO $$
DECLARE
  function_definition TEXT;
  repaired_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(
    'public.replace_project_schedule_dates(uuid,jsonb)'::regprocedure
  ) INTO function_definition;

  IF position('min(existing.id) AS id' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'expected 036 function definition was not found';
  END IF;

  repaired_definition := replace(
    function_definition,
    'min(existing.id) AS id',
    'min(existing.id::text)::uuid AS id'
  );

  EXECUTE repaired_definition;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_schedule_dates(UUID, JSONB)
  TO authenticated;

COMMIT;
