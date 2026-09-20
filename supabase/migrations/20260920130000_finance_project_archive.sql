-- Reversible quarantine for synthetic or retired finance projects.
-- Archived records remain available by direct authorized detail/audit access,
-- but are absent from the normal finance project list and its totals.

BEGIN;

ALTER TABLE public.project_finance
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS project_finance_active_list_idx
  ON public.project_finance(project_id)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.finance_set_project_archive(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_archived BOOLEAN,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE previous_state JSONB;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_is_global(p_actor_user_id) THEN
    RAISE EXCEPTION 'global finance permission required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object('archivedAt', archived_at) INTO previous_state
  FROM public.project_finance WHERE project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'project finance record not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.project_finance
  SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END,
      updated_at = now(), updated_by = p_actor_user_id
  WHERE project_id = p_project_id;
  PERFORM public.finance_audit(
    p_project_id, p_actor_user_id,
    CASE WHEN p_archived THEN 'project.archived' ELSE 'project.unarchived' END,
    'project_finance', p_project_id, previous_state,
    jsonb_build_object('archived', p_archived), p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finance_set_project_archive(UUID, UUID, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_set_project_archive(UUID, UUID, BOOLEAN, TEXT)
  TO authenticated, service_role;

COMMIT;
