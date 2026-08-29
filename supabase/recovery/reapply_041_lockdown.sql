-- restore_pre_041_compatibility.sql 실행 뒤 신버전으로 재전환할 때만 Supabase migration으로 실행한다.

BEGIN;

DROP POLICY IF EXISTS applications_anyone_insert ON public.project_applications;
DROP POLICY IF EXISTS applications_anon_insert ON public.project_applications;
DROP POLICY IF EXISTS applications_authenticated_insert ON public.project_applications;
DROP POLICY IF EXISTS applications_self_update ON public.project_applications;

REVOKE INSERT ON TABLE public.project_applications FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.project_accepts_applications(UUID);

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
  updated_at = EXCLUDED.updated_at
WHERE public.crew_member_payout_accounts.updated_at <= EXCLUDED.updated_at;

DROP TRIGGER IF EXISTS sync_legacy_payout_to_private ON public.crew_members;
DROP FUNCTION IF EXISTS public.sync_legacy_payout_to_private();
DROP TRIGGER IF EXISTS set_legacy_payout_updated_at ON public.crew_members;
DROP FUNCTION IF EXISTS public.mark_legacy_payout_updated_at();

ALTER TABLE public.crew_members
  DROP COLUMN IF EXISTS bank_code,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account,
  DROP COLUMN IF EXISTS bank_holder,
  DROP COLUMN IF EXISTS payout_legacy_updated_at;

COMMIT;
