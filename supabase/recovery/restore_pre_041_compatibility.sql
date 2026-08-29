-- 긴급 forward-recovery 전용.
-- 041 적용 뒤 애플리케이션을 구버전으로 되돌려야 할 때만 Supabase migration으로 실행한다.

BEGIN;

ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder TEXT,
  ADD COLUMN IF NOT EXISTS payout_legacy_updated_at TIMESTAMPTZ;

UPDATE public.crew_members member
SET bank_code = payout.bank_code,
    bank_name = payout.bank_name,
    bank_account = payout.bank_account,
    bank_holder = payout.bank_holder
FROM public.crew_member_payout_accounts payout
WHERE payout.crew_member_id = member.id;

UPDATE public.crew_members
SET payout_legacy_updated_at = now()
WHERE bank_code IS NOT NULL
   OR bank_name IS NOT NULL
   OR bank_account IS NOT NULL
   OR bank_holder IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.sync_legacy_payout_to_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.crew_member_payout_accounts (
    crew_member_id, bank_code, bank_name, bank_account, bank_holder, updated_at
  ) VALUES (
    NEW.id,
    NEW.bank_code,
    NEW.bank_name,
    NEW.bank_account,
    NEW.bank_holder,
    COALESCE(NEW.payout_legacy_updated_at, now())
  )
  ON CONFLICT (crew_member_id) DO UPDATE SET
    bank_code = EXCLUDED.bank_code,
    bank_name = EXCLUDED.bank_name,
    bank_account = EXCLUDED.bank_account,
    bank_holder = EXCLUDED.bank_holder,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_legacy_payout_to_private()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_legacy_payout_updated_at ON public.crew_members;
CREATE TRIGGER set_legacy_payout_updated_at
  BEFORE UPDATE OF bank_code, bank_name, bank_account, bank_holder
  ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_legacy_payout_updated_at();

DROP TRIGGER IF EXISTS sync_legacy_payout_to_private ON public.crew_members;
CREATE TRIGGER sync_legacy_payout_to_private
  AFTER UPDATE OF bank_code, bank_name, bank_account, bank_holder
  ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legacy_payout_to_private();

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
      AND (
        (auth.role() = 'anon' AND project.visibility = 'public')
        OR (
          auth.role() = 'authenticated'
          AND public.user_can_access_project(auth.uid(), project.id)
        )
      )
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
  USING (
    user_id = (SELECT auth.uid())
    AND status IN ('pending', 'rejected')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status IN ('pending', 'rejected')
  );

CREATE OR REPLACE FUNCTION public.guard_legacy_application_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT public.is_admin_or_owner(auth.uid())
     AND (
       to_jsonb(NEW) - ARRAY[
         'motivation', 'fee_agreement', 'answers_note', 'answers', 'created_at'
       ]
       IS DISTINCT FROM
       to_jsonb(OLD) - ARRAY[
         'motivation', 'fee_agreement', 'answers_note', 'answers', 'created_at'
       ]
     ) THEN
    RAISE EXCEPTION 'legacy self update attempted protected fields'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_legacy_application_self_update()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_legacy_application_self_update
  ON public.project_applications;
CREATE TRIGGER guard_legacy_application_self_update
  BEFORE UPDATE ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_legacy_application_self_update();

COMMIT;
