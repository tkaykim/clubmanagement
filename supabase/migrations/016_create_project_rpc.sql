-- 프로젝트 생성 RPC 함수 (PostgREST 스키마 캐시 우회)
CREATE OR REPLACE FUNCTION public.create_project(
  p_owner_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general',
  p_poster_url TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_schedule_undecided BOOLEAN DEFAULT false,
  p_budget INTEGER DEFAULT 0,
  p_recruitment_start_at TIMESTAMPTZ DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_max_participants INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT 'recruiting'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.projects (
    owner_id, title, description, category, poster_url,
    start_date, end_date, schedule_undecided, budget,
    recruitment_start_at, due_date, max_participants, status
  ) VALUES (
    p_owner_id, p_title, p_description, p_category, p_poster_url,
    p_start_date, p_end_date, p_schedule_undecided, p_budget,
    p_recruitment_start_at, p_due_date, p_max_participants, p_status
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
