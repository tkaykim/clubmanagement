-- 긴급 forward-recovery 전용.
-- 038 적용 뒤 애플리케이션을 구버전으로 되돌려야 할 때만 Supabase migration으로 실행한다.

BEGIN;

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder TEXT;

UPDATE public.crew_members member
SET bank_code = payout.bank_code,
    bank_name = payout.bank_name,
    bank_account = payout.bank_account,
    bank_holder = payout.bank_holder
FROM public.crew_member_payout_accounts payout
WHERE payout.crew_member_id = member.id;

CREATE OR REPLACE FUNCTION public.project_accepts_applications(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects project
    WHERE project.id = p_project_id
      AND project.status = 'recruiting'
      AND (project.recruitment_start_at IS NULL OR now() >= project.recruitment_start_at)
      AND (project.recruitment_end_at IS NULL OR now() < project.recruitment_end_at)
  );
$$;

REVOKE ALL ON FUNCTION public.project_accepts_applications(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_accepts_applications(UUID)
  TO anon, authenticated;

GRANT INSERT ON TABLE public.project_applications TO anon, authenticated;

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
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND public.project_accepts_applications(project_id)
  );

DROP POLICY IF EXISTS applications_self_update ON public.project_applications;
CREATE POLICY applications_self_update ON public.project_applications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

COMMIT;
