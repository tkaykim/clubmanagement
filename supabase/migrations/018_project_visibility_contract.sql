-- 018_project_visibility_contract.sql
-- projects.visibility 에 'contract' 추가:
--   contract — 계약멤버 이상 (owner, admin, member+contract). 비계약/게스트는 못 봄.

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_visibility_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_visibility_check
  CHECK (visibility IN ('public', 'admin', 'contract', 'private'));

CREATE OR REPLACE FUNCTION public.current_user_is_contract_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crew_members
    WHERE user_id = auth.uid()
      AND COALESCE(is_active, true) = true
      AND (
        role IN ('admin', 'owner')
        OR contract_type = 'contract'
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.current_user_is_contract_or_above() TO authenticated;

DROP POLICY IF EXISTS "projects_auth_select" ON public.projects;
CREATE POLICY "projects_auth_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_active() AND (
      visibility = 'public'
      OR (visibility = 'admin' AND public.current_user_is_active_admin())
      OR (visibility = 'contract' AND public.current_user_is_contract_or_above())
      OR (visibility = 'private' AND (
        owner_id = auth.uid() OR public.current_user_is_active_owner()
      ))
    )
  );
