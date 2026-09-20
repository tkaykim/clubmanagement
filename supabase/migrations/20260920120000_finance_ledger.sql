-- OneShot Crew private finance ledger.
-- No production grants, amounts, managers, or transactions are seeded here.

BEGIN;

COMMENT ON COLUMN public.projects.fee IS
  'Public advertised per-participant offer/participation amount only; never a project budget or privately agreed allowance. Private finance values live in project_finance and finance_allowance_items.';

CREATE TABLE public.finance_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ceo', 'finance')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  reason TEXT,
  UNIQUE (user_id, role)
);

CREATE UNIQUE INDEX finance_access_grants_one_active_role
  ON public.finance_access_grants(user_id)
  WHERE disabled_at IS NULL;

CREATE TABLE public.finance_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  default_lead_crew_member_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.finance_settings(id) VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE public.project_finance (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency ~ '^[A-Z]{3}$'),
  budget_amount NUMERIC(20,2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  contract_supply_amount NUMERIC(20,2) CHECK (contract_supply_amount IS NULL OR contract_supply_amount >= 0),
  contract_vat_amount NUMERIC(20,2) CHECK (contract_vat_amount IS NULL OR contract_vat_amount >= 0),
  contract_total_amount NUMERIC(20,2) CHECK (contract_total_amount IS NULL OR contract_total_amount >= 0),
  contract_amount_basis TEXT NOT NULL DEFAULT 'undecided'
    CHECK (contract_amount_basis IN ('supply_vat', 'total_only', 'undecided')),
  contract_note TEXT,
  client_name TEXT,
  contract_source_system TEXT,
  contract_source_id TEXT,
  budget_source_system TEXT,
  budget_source_id TEXT,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.finance_project_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id),
  UNIQUE (project_id, crew_member_id)
);

CREATE UNIQUE INDEX finance_project_managers_one_primary
  ON public.finance_project_managers(project_id)
  WHERE is_primary;
CREATE INDEX finance_project_managers_user_idx
  ON public.finance_project_managers(user_id, project_id);

CREATE TABLE public.finance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('budget', 'contract', 'allowance', 'receipt', 'payment', 'external_link')),
  reference_value TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  content_sha256 TEXT,
  source_system TEXT,
  source_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reference_value IS NOT NULL OR storage_path IS NOT NULL OR source_id IS NOT NULL)
);

CREATE TABLE public.finance_allowance_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'confirmed', 'rejected', 'superseded')),
  previous_batch_id UUID REFERENCES public.finance_allowance_batches(id) ON DELETE RESTRICT,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE UNIQUE INDEX finance_allowance_batches_one_working
  ON public.finance_allowance_batches(project_id)
  WHERE status IN ('draft', 'submitted', 'rejected');
CREATE UNIQUE INDEX finance_allowance_batches_one_current_confirmed
  ON public.finance_allowance_batches(project_id)
  WHERE status = 'confirmed';

CREATE TABLE public.finance_allowance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.finance_allowance_batches(id) ON DELETE RESTRICT,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_crew_member_id UUID REFERENCES public.crew_members(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_amount_raw TEXT,
  gross_amount NUMERIC(20,2) CHECK (gross_amount IS NULL OR gross_amount >= 0),
  tax_type TEXT NOT NULL DEFAULT 'undecided'
    CHECK (tax_type IN ('undecided', 'business_income_3_3', 'invoice', 'foreign', 'none')),
  taxable_amount NUMERIC(20,2),
  income_tax_amount NUMERIC(20,2),
  local_income_tax_amount NUMERIC(20,2),
  deduction_amount NUMERIC(20,2),
  net_amount NUMERIC(20,2),
  tax_policy_version TEXT,
  scheduled_payment_date DATE,
  evidence_id UUID REFERENCES public.finance_evidence(id) ON DELETE RESTRICT,
  evidence_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (gross_amount IS NOT NULL OR requested_amount_raw IS NOT NULL),
  CHECK (net_amount IS NULL OR net_amount >= 0)
);

CREATE INDEX finance_allowance_items_recipient_idx
  ON public.finance_allowance_items(recipient_user_id, batch_id);

CREATE TABLE public.finance_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_account_ref TEXT NOT NULL,
  source_transaction_id TEXT NOT NULL,
  source_owned_by TEXT,
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  received_at TIMESTAMPTZ,
  counterparty TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'failed', 'cancelled', 'reversed')),
  evidence_id UUID REFERENCES public.finance_evidence(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_account_ref, source_transaction_id)
);

CREATE TABLE public.finance_receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.finance_receipts(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, project_id)
);

CREATE INDEX finance_receipt_allocations_project_idx
  ON public.finance_receipt_allocations(project_id, receipt_id);

CREATE TABLE public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_account_ref TEXT NOT NULL,
  source_transaction_id TEXT NOT NULL,
  source_owned_by TEXT,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'failed', 'cancelled', 'reversed')),
  evidence_id UUID REFERENCES public.finance_evidence(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_account_ref, source_transaction_id)
);

CREATE TABLE public.finance_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.finance_payments(id) ON DELETE RESTRICT,
  allowance_item_id UUID NOT NULL REFERENCES public.finance_allowance_items(id) ON DELETE RESTRICT,
  amount NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payment_id, allowance_item_id)
);

CREATE INDEX finance_payment_allocations_item_idx
  ON public.finance_payment_allocations(allowance_item_id, payment_id);

CREATE TABLE public.finance_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX finance_audit_events_project_idx
  ON public.finance_audit_events(project_id, occurred_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.finance_assert_actor(p_actor_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'finance actor is required' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(auth.role(), '') <> 'service_role' AND p_actor_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'finance actor mismatch' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_is_global(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.finance_access_grants grant_row
    WHERE grant_row.user_id = p_user_id
      AND grant_row.disabled_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.finance_can_manage_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.finance_is_global(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.finance_project_managers manager
      JOIN public.crew_members member
        ON member.id = manager.crew_member_id
       AND member.user_id = manager.user_id
       AND member.is_active = true
      WHERE manager.project_id = p_project_id
        AND manager.user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.finance_can_view_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.finance_can_manage_project(p_user_id, p_project_id)
    OR EXISTS (
      SELECT 1
      FROM public.finance_allowance_batches batch
      JOIN public.finance_allowance_items item ON item.batch_id = batch.id
      WHERE batch.project_id = p_project_id
        AND batch.status = 'confirmed'
        AND item.recipient_user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.finance_is_confirmed_recipient(
  p_user_id UUID,
  p_batch_id UUID,
  p_item_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.finance_allowance_batches batch
    JOIN public.finance_allowance_items item ON item.batch_id = batch.id
    WHERE batch.id = p_batch_id
      AND batch.status = 'confirmed'
      AND item.recipient_user_id = p_user_id
      AND (p_item_id IS NULL OR item.id = p_item_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.finance_can_manage_payment(p_user_id UUID, p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.finance_payment_allocations allocation
    JOIN public.finance_allowance_items item ON item.id = allocation.allowance_item_id
    JOIN public.finance_allowance_batches batch ON batch.id = item.batch_id
    WHERE allocation.payment_id = p_payment_id
      AND public.finance_can_manage_project(p_user_id, batch.project_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.finance_get_my_payment_allocations(p_actor_user_id UUID)
RETURNS TABLE(
  allowance_item_id UUID,
  amount NUMERIC,
  paid_at TIMESTAMPTZ,
  status TEXT,
  evidence_present BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  RETURN QUERY
    SELECT allocation.allowance_item_id, allocation.amount, payment.paid_at,
      payment.status, payment.evidence_id IS NOT NULL
    FROM public.finance_payment_allocations allocation
    JOIN public.finance_payments payment ON payment.id = allocation.payment_id
    JOIN public.finance_allowance_items item ON item.id = allocation.allowance_item_id
    JOIN public.finance_allowance_batches batch ON batch.id = item.batch_id
    WHERE item.recipient_user_id = p_actor_user_id
      AND payment.recipient_user_id = p_actor_user_id
      AND batch.status = 'confirmed';
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_get_my_pending_confirmation_count(p_actor_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE pending_count INTEGER;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  SELECT count(DISTINCT batch.project_id)::INTEGER INTO pending_count
  FROM public.finance_allowance_batches batch
  JOIN public.finance_allowance_items item ON item.batch_id = batch.id
  WHERE item.recipient_user_id = p_actor_user_id
    AND batch.status IN ('draft', 'submitted');
  RETURN pending_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_get_my_project_currency(
  p_actor_user_id UUID,
  p_project_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE project_currency TEXT;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_can_view_project(p_actor_user_id, p_project_id) THEN
    RAISE EXCEPTION 'project finance permission required' USING ERRCODE = '42501';
  END IF;
  SELECT currency INTO project_currency FROM public.project_finance WHERE project_id = p_project_id;
  RETURN project_currency;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_audit(
  p_project_id UUID,
  p_actor_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_before JSONB,
  p_after JSONB,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  INSERT INTO public.finance_audit_events(
    project_id, actor_user_id, action, entity_type, entity_id,
    before_data, after_data, reason
  ) VALUES (
    p_project_id, p_actor_user_id, p_action, p_entity_type, p_entity_id,
    p_before, p_after, NULLIF(btrim(p_reason), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_validate_manager_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.crew_members member
    WHERE member.id = NEW.crew_member_id
      AND member.user_id = NEW.user_id
      AND member.is_active = true
  ) THEN
    RAISE EXCEPTION 'finance manager must be an active linked crew member' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_validate_manager_row_trigger
  BEFORE INSERT OR UPDATE ON public.finance_project_managers
  FOR EACH ROW EXECUTE FUNCTION public.finance_validate_manager_row();

CREATE OR REPLACE FUNCTION public.finance_initialize_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  default_member RECORD;
BEGIN
  INSERT INTO public.project_finance(project_id, updated_by)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT (project_id) DO NOTHING;

  SELECT member.id, member.user_id
  INTO default_member
  FROM public.finance_settings settings
  JOIN public.crew_members member
    ON member.id = settings.default_lead_crew_member_id
   AND member.is_active = true
   AND member.user_id IS NOT NULL
  WHERE settings.id = 'default';

  IF FOUND THEN
    INSERT INTO public.finance_project_managers(
      project_id, user_id, crew_member_id, is_primary, assigned_by
    ) VALUES (
      NEW.id, default_member.user_id, default_member.id, true, NEW.owner_id
    ) ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_initialize_project_trigger
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.finance_initialize_project();

INSERT INTO public.project_finance(project_id)
SELECT project.id FROM public.projects project
ON CONFLICT (project_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.finance_upsert_project_budget(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_expected_version INTEGER,
  p_payload JSONB
)
RETURNS TABLE(project_id UUID, version INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  finance_row public.project_finance%ROWTYPE;
  before_row JSONB;
  evidence_row_id UUID;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_is_global(p_actor_user_id) THEN
    RAISE EXCEPTION 'global finance permission required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.project_finance(project_id) VALUES (p_project_id)
  ON CONFLICT ON CONSTRAINT project_finance_pkey DO NOTHING;
  SELECT * INTO finance_row FROM public.project_finance
  WHERE project_finance.project_id = p_project_id FOR UPDATE;
  IF finance_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT:%', finance_row.version USING ERRCODE = '40001';
  END IF;
  before_row := to_jsonb(finance_row);

  IF NULLIF(p_payload->>'evidenceRef', '') IS NOT NULL THEN
    INSERT INTO public.finance_evidence(
      project_id, kind, reference_value, created_by
    ) VALUES (
      p_project_id, 'budget', p_payload->>'evidenceRef', p_actor_user_id
    ) RETURNING id INTO evidence_row_id;
  END IF;

  UPDATE public.project_finance SET
    currency = p_payload->>'currency',
    budget_amount = NULLIF(p_payload->>'budgetAmount', '')::NUMERIC,
    contract_supply_amount = NULLIF(p_payload->>'contractSupplyAmount', '')::NUMERIC,
    contract_vat_amount = NULLIF(p_payload->>'contractVatAmount', '')::NUMERIC,
    contract_total_amount = NULLIF(p_payload->>'contractTotalAmount', '')::NUMERIC,
    contract_amount_basis = p_payload->>'contractAmountBasis',
    contract_note = NULLIF(p_payload->>'contractNote', ''),
    client_name = NULLIF(p_payload->>'clientName', ''),
    contract_source_system = NULLIF(p_payload->>'contractSourceSystem', ''),
    contract_source_id = NULLIF(p_payload->>'contractSourceId', ''),
    budget_source_system = NULLIF(p_payload->>'budgetSourceSystem', ''),
    budget_source_id = NULLIF(p_payload->>'budgetSourceId', ''),
    version = project_finance.version + 1,
    updated_at = now(),
    updated_by = p_actor_user_id
  WHERE project_finance.project_id = p_project_id
  RETURNING * INTO finance_row;

  PERFORM public.finance_audit(
    p_project_id, p_actor_user_id, 'budget.updated', 'project_finance', p_project_id,
    before_row, to_jsonb(finance_row) || jsonb_build_object('evidenceId', evidence_row_id),
    p_payload->>'reason'
  );
  RETURN QUERY SELECT finance_row.project_id, finance_row.version;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_set_project_managers(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_expected_version INTEGER,
  p_managers JSONB,
  p_reason TEXT
)
RETURNS TABLE(project_id UUID, version INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  finance_row public.project_finance%ROWTYPE;
  before_rows JSONB;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_is_global(p_actor_user_id) THEN
    RAISE EXCEPTION 'global finance permission required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_managers) <> 'array' THEN
    RAISE EXCEPTION 'managers must be an array' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.project_finance(project_id) VALUES (p_project_id)
  ON CONFLICT ON CONSTRAINT project_finance_pkey DO NOTHING;
  SELECT * INTO finance_row FROM public.project_finance
  WHERE project_finance.project_id = p_project_id FOR UPDATE;
  IF finance_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT:%', finance_row.version USING ERRCODE = '40001';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(manager_row)), '[]'::JSONB)
  INTO before_rows
  FROM public.finance_project_managers manager_row
  WHERE manager_row.project_id = p_project_id;

  DELETE FROM public.finance_project_managers
  WHERE finance_project_managers.project_id = p_project_id;
  INSERT INTO public.finance_project_managers(
    project_id, user_id, crew_member_id, is_primary, assigned_by
  )
  SELECT
    p_project_id,
    member.user_id,
    member.id,
    COALESCE((entry.value->>'isPrimary')::BOOLEAN, false),
    p_actor_user_id
  FROM jsonb_array_elements(p_managers) entry(value)
  JOIN public.crew_members member
    ON member.id = (entry.value->>'crewMemberId')::UUID
   AND member.is_active = true
   AND member.user_id IS NOT NULL;

  IF (SELECT count(*) FROM jsonb_array_elements(p_managers)) <>
     (SELECT count(*) FROM public.finance_project_managers
      WHERE finance_project_managers.project_id = p_project_id) THEN
    RAISE EXCEPTION 'one or more finance managers are not active linked crew members' USING ERRCODE = '23514';
  END IF;

  UPDATE public.project_finance SET
    version = project_finance.version + 1,
    updated_at = now(),
    updated_by = p_actor_user_id
  WHERE project_finance.project_id = p_project_id
  RETURNING * INTO finance_row;

  PERFORM public.finance_audit(
    p_project_id, p_actor_user_id, 'managers.replaced', 'project_finance', p_project_id,
    before_rows,
    (SELECT COALESCE(jsonb_agg(to_jsonb(manager_row)), '[]'::JSONB)
     FROM public.finance_project_managers manager_row WHERE manager_row.project_id = p_project_id),
    p_reason
  );
  RETURN QUERY SELECT finance_row.project_id, finance_row.version;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_save_allowance_draft(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_expected_revision INTEGER,
  p_items JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(batch_id UUID, revision INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  batch_row public.finance_allowance_batches%ROWTYPE;
  prior_confirmed UUID;
  next_version INTEGER;
  inserted_count INTEGER;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_can_manage_project(p_actor_user_id, p_project_id) THEN
    RAISE EXCEPTION 'project finance permission required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be an array' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.project_finance finance_row
  WHERE finance_row.project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'project finance record not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO batch_row
  FROM public.finance_allowance_batches
  WHERE finance_allowance_batches.project_id = p_project_id AND status IN ('draft', 'rejected')
  FOR UPDATE;

  IF FOUND THEN
    IF p_expected_revision IS NULL OR batch_row.revision <> p_expected_revision THEN
      RAISE EXCEPTION 'VERSION_CONFLICT:%', batch_row.revision USING ERRCODE = '40001';
    END IF;
    DELETE FROM public.finance_allowance_items WHERE finance_allowance_items.batch_id = batch_row.id;
    UPDATE public.finance_allowance_batches SET
      status = 'draft', rejection_reason = NULL, revision = finance_allowance_batches.revision + 1,
      updated_at = now()
    WHERE id = batch_row.id RETURNING * INTO batch_row;
  ELSE
    IF p_expected_revision IS NOT NULL THEN
      RAISE EXCEPTION 'VERSION_CONFLICT:0' USING ERRCODE = '40001';
    END IF;
    SELECT id INTO prior_confirmed FROM public.finance_allowance_batches
    WHERE finance_allowance_batches.project_id = p_project_id AND status = 'confirmed';
    SELECT COALESCE(max(version), 0) + 1 INTO next_version
    FROM public.finance_allowance_batches WHERE finance_allowance_batches.project_id = p_project_id;
    INSERT INTO public.finance_allowance_batches(
      project_id, version, revision, previous_batch_id, created_by
    ) VALUES (
      p_project_id, next_version, 1, prior_confirmed, p_actor_user_id
    ) RETURNING * INTO batch_row;
  END IF;

  INSERT INTO public.finance_allowance_items(
    id, batch_id, recipient_user_id, recipient_crew_member_id,
    category, reason, requested_amount_raw, gross_amount, tax_type,
    scheduled_payment_date, evidence_reference
  )
  SELECT
    COALESCE(NULLIF(entry.value->>'id', '')::UUID, gen_random_uuid()),
    batch_row.id,
    (entry.value->>'recipientUserId')::UUID,
    member.id,
    entry.value->>'category',
    entry.value->>'reason',
    NULLIF(entry.value->>'requestedAmountRaw', ''),
    NULLIF(entry.value->>'grossAmount', '')::NUMERIC,
    COALESCE(NULLIF(entry.value->>'taxType', ''), 'undecided'),
    NULLIF(entry.value->>'scheduledPaymentDate', '')::DATE,
    NULLIF(entry.value->>'evidenceRef', '')
  FROM jsonb_array_elements(p_items) entry(value)
  JOIN public.crew_members member
    ON member.user_id = (entry.value->>'recipientUserId')::UUID
   AND member.is_active = true
  ;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count <> (SELECT count(*) FROM jsonb_array_elements(p_items)) THEN
    RAISE EXCEPTION 'every recipient must be an active linked crew member' USING ERRCODE = '23514';
  END IF;

  PERFORM public.finance_audit(
    p_project_id, p_actor_user_id, 'allowances.saved', 'allowance_batch', batch_row.id,
    NULL, jsonb_build_object('revision', batch_row.revision, 'itemCount', inserted_count), p_reason
  );
  RETURN QUERY SELECT batch_row.id, batch_row.revision;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_submit_allowance_batch(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_expected_revision INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(batch_id UUID, revision INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE batch_row public.finance_allowance_batches%ROWTYPE;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_can_manage_project(p_actor_user_id, p_project_id) THEN
    RAISE EXCEPTION 'project finance permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO batch_row FROM public.finance_allowance_batches
  WHERE finance_allowance_batches.project_id = p_project_id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no draft allowance batch' USING ERRCODE = 'P0002'; END IF;
  IF batch_row.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'VERSION_CONFLICT:%', batch_row.revision USING ERRCODE = '40001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_allowance_items WHERE finance_allowance_items.batch_id = batch_row.id) THEN
    RAISE EXCEPTION 'allowance batch is empty' USING ERRCODE = '22023';
  END IF;
  UPDATE public.finance_allowance_batches SET
    status = 'submitted', revision = finance_allowance_batches.revision + 1,
    submitted_by = p_actor_user_id, submitted_at = now(), updated_at = now()
  WHERE id = batch_row.id RETURNING * INTO batch_row;
  PERFORM public.finance_audit(p_project_id, p_actor_user_id, 'allowances.submitted',
    'allowance_batch', batch_row.id, NULL, jsonb_build_object('revision', batch_row.revision), p_reason);
  RETURN QUERY SELECT batch_row.id, batch_row.revision;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_confirm_allowance_batch(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_expected_revision INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(batch_id UUID, revision INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  batch_row public.finance_allowance_batches%ROWTYPE;
  budget_value NUMERIC;
  gross_total NUMERIC;
  project_currency TEXT;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_is_global(p_actor_user_id) THEN
    RAISE EXCEPTION 'global finance permission required' USING ERRCODE = '42501';
  END IF;
  SELECT budget_amount, currency INTO budget_value, project_currency FROM public.project_finance
  WHERE project_finance.project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'project finance record not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO batch_row FROM public.finance_allowance_batches
  WHERE finance_allowance_batches.project_id = p_project_id AND status = 'submitted' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no submitted allowance batch' USING ERRCODE = 'P0002'; END IF;
  IF batch_row.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'VERSION_CONFLICT:%', batch_row.revision USING ERRCODE = '40001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.finance_allowance_items item
    WHERE item.batch_id = batch_row.id
      AND (item.gross_amount IS NULL OR item.tax_type = 'undecided')
  ) THEN
    RAISE EXCEPTION 'all allowance amounts and tax types must be decided' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.finance_allowance_items item
    WHERE item.batch_id = batch_row.id AND item.tax_type = 'foreign'
  ) THEN
    RAISE EXCEPTION 'foreign allowance withholding requires a separately reviewed tax calculation' USING ERRCODE = '22023';
  END IF;
  IF project_currency = 'KRW' AND EXISTS (
    SELECT 1 FROM public.finance_allowance_items item
    WHERE item.batch_id = batch_row.id AND item.gross_amount <> trunc(item.gross_amount)
  ) THEN
    RAISE EXCEPTION 'KRW allowance amounts must be whole won' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(sum(gross_amount), 0) INTO gross_total
  FROM public.finance_allowance_items WHERE finance_allowance_items.batch_id = batch_row.id;
  IF budget_value IS NULL THEN
    RAISE EXCEPTION 'project budget must be configured before confirmation' USING ERRCODE = '22023';
  END IF;
  IF gross_total > budget_value THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED:%', budget_value USING ERRCODE = 'P0001';
  END IF;

  -- A paid confirmed version is accounting history.  A replacement would detach
  -- allocations from the current view, so adjustments need a dedicated ledger flow.
  IF EXISTS (
    SELECT 1
    FROM public.finance_allowance_batches prior_batch
    JOIN public.finance_allowance_items prior_item ON prior_item.batch_id = prior_batch.id
    JOIN public.finance_payment_allocations prior_allocation ON prior_allocation.allowance_item_id = prior_item.id
    JOIN public.finance_payments prior_payment ON prior_payment.id = prior_allocation.payment_id
    WHERE prior_batch.project_id = p_project_id
      AND prior_batch.status = 'confirmed'
      AND prior_payment.status = 'executed'
  ) THEN
    RAISE EXCEPTION 'cannot replace a confirmed allowance batch after payment; record an adjustment instead' USING ERRCODE = '55000';
  END IF;

  UPDATE public.finance_allowance_items SET
    taxable_amount = gross_amount,
    income_tax_amount = CASE WHEN tax_type = 'business_income_3_3' THEN trunc(gross_amount * 0.03) ELSE 0 END,
    local_income_tax_amount = CASE WHEN tax_type = 'business_income_3_3' THEN trunc(trunc(gross_amount * 0.03) / 10) ELSE 0 END,
    deduction_amount = CASE WHEN tax_type = 'business_income_3_3'
      THEN trunc(gross_amount * 0.03) + trunc(trunc(gross_amount * 0.03) / 10) ELSE 0 END,
    net_amount = gross_amount - CASE WHEN tax_type = 'business_income_3_3'
      THEN trunc(gross_amount * 0.03) + trunc(trunc(gross_amount * 0.03) / 10) ELSE 0 END,
    tax_policy_version = 'kr-business-income-3.3-v1-floor-won',
    updated_at = now()
  WHERE finance_allowance_items.batch_id = batch_row.id;

  UPDATE public.finance_allowance_batches SET status = 'superseded', updated_at = now()
  WHERE finance_allowance_batches.project_id = p_project_id AND status = 'confirmed';
  UPDATE public.finance_allowance_batches SET
    status = 'confirmed', revision = finance_allowance_batches.revision + 1,
    confirmed_by = p_actor_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = batch_row.id RETURNING * INTO batch_row;
  PERFORM public.finance_audit(p_project_id, p_actor_user_id, 'allowances.confirmed',
    'allowance_batch', batch_row.id, NULL,
    jsonb_build_object('revision', batch_row.revision, 'grossTotal', gross_total), p_reason);
  RETURN QUERY SELECT batch_row.id, batch_row.revision;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_record_receipt(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE receipt_id UUID; evidence_row_id UUID; existing_record RECORD; request_fingerprint TEXT;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_is_global(p_actor_user_id) THEN
    RAISE EXCEPTION 'global finance permission required' USING ERRCODE = '42501';
  END IF;
  IF p_payload->>'status' = 'pending' THEN
    RAISE EXCEPTION 'pending transactions are not recorded as immutable evidence' USING ERRCODE = '22023';
  END IF;
  IF p_payload->>'status' = 'executed'
     AND (NULLIF(p_payload->>'receivedAt', '') IS NULL OR NULLIF(p_payload->>'evidenceRef', '') IS NULL) THEN
    RAISE EXCEPTION 'executed receipt requires receivedAt and evidenceRef' USING ERRCODE = '22023';
  END IF;
  request_fingerprint := md5((p_payload || jsonb_build_object('projectId', p_project_id))::TEXT);
  SELECT receipt.id, receipt.request_fingerprint
  INTO existing_record FROM public.finance_receipts receipt
  WHERE receipt.idempotency_key = p_payload->>'idempotencyKey';
  IF FOUND THEN
    IF existing_record.request_fingerprint = request_fingerprint THEN
      RETURN existing_record.id;
    END IF;
    RAISE EXCEPTION 'DUPLICATE_TRANSACTION:idempotency key payload mismatch' USING ERRCODE = '23505';
  END IF;
  PERFORM 1 FROM public.project_finance
  WHERE project_finance.project_id = p_project_id AND currency = p_payload->>'currency' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction currency must match project currency' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.finance_receipts
    WHERE source_system = p_payload->>'sourceSystem'
      AND source_account_ref = p_payload->>'sourceAccountRef'
      AND source_transaction_id = p_payload->>'sourceTransactionId'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_TRANSACTION:source transaction already recorded' USING ERRCODE = '23505';
  END IF;
  IF NULLIF(p_payload->>'evidenceRef', '') IS NOT NULL THEN
    INSERT INTO public.finance_evidence(project_id, kind, reference_value, source_system, source_id, created_by)
    VALUES (p_project_id, 'receipt', p_payload->>'evidenceRef', p_payload->>'sourceSystem',
      p_payload->>'sourceTransactionId', p_actor_user_id) RETURNING id INTO evidence_row_id;
  END IF;
  INSERT INTO public.finance_receipts(
    idempotency_key, request_fingerprint, source_system, source_account_ref, source_transaction_id,
    source_owned_by, amount, currency, received_at, counterparty, status,
    evidence_id, recorded_by
  ) VALUES (
    p_payload->>'idempotencyKey', request_fingerprint, p_payload->>'sourceSystem', p_payload->>'sourceAccountRef',
    p_payload->>'sourceTransactionId', NULLIF(p_payload->>'sourceOwnedBy', ''),
    (p_payload->>'amount')::NUMERIC, p_payload->>'currency',
    NULLIF(p_payload->>'receivedAt', '')::TIMESTAMPTZ, NULLIF(p_payload->>'counterparty', ''),
    p_payload->>'status', evidence_row_id, p_actor_user_id
  ) RETURNING id INTO receipt_id;
  INSERT INTO public.finance_receipt_allocations(receipt_id, project_id, amount)
  VALUES (receipt_id, p_project_id, (p_payload->>'amount')::NUMERIC);
  PERFORM public.finance_audit(p_project_id, p_actor_user_id, 'receipt.recorded',
    'receipt', receipt_id, NULL, p_payload - 'evidenceRef', NULL);
  RETURN receipt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_record_payment(
  p_actor_user_id UUID,
  p_project_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment_id UUID;
  evidence_row_id UUID;
  existing_record RECORD;
  allocation_total NUMERIC;
  allocation_entry JSONB;
  item_row RECORD;
  prior_paid NUMERIC;
  request_fingerprint TEXT;
  project_currency TEXT;
BEGIN
  PERFORM public.finance_assert_actor(p_actor_user_id);
  IF NOT public.finance_is_global(p_actor_user_id) THEN
    RAISE EXCEPTION 'global finance permission required' USING ERRCODE = '42501';
  END IF;
  IF p_payload->>'status' = 'pending' THEN
    RAISE EXCEPTION 'pending transactions are not recorded as immutable evidence' USING ERRCODE = '22023';
  END IF;
  IF p_payload->>'status' = 'executed'
     AND (NULLIF(p_payload->>'paidAt', '') IS NULL OR NULLIF(p_payload->>'evidenceRef', '') IS NULL) THEN
    RAISE EXCEPTION 'executed payment requires paidAt and evidenceRef' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload->'allocations') <> 'array' THEN
    RAISE EXCEPTION 'allocations must be an array' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(p_payload->>'recipientUserId', '') IS NULL THEN
    RAISE EXCEPTION 'payment recipient is required' USING ERRCODE = '22023';
  END IF;
  SELECT currency INTO project_currency FROM public.project_finance
  WHERE project_finance.project_id = p_project_id FOR UPDATE;
  IF NOT FOUND OR project_currency <> p_payload->>'currency' THEN
    RAISE EXCEPTION 'transaction currency must match project currency' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(sum((entry.value->>'amount')::NUMERIC), 0) INTO allocation_total
  FROM jsonb_array_elements(p_payload->'allocations') entry(value);
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_payload->'allocations') entry(value)
    GROUP BY entry.value->>'allowanceItemId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate payment allowance allocations are not allowed' USING ERRCODE = '22023';
  END IF;
  IF allocation_total > (p_payload->>'amount')::NUMERIC THEN
    RAISE EXCEPTION 'ALLOCATION_EXCEEDED:payment amount' USING ERRCODE = 'P0001';
  END IF;
  request_fingerprint := md5((p_payload || jsonb_build_object('projectId', p_project_id))::TEXT);
  SELECT payment.id, payment.request_fingerprint
  INTO existing_record FROM public.finance_payments payment
  WHERE payment.idempotency_key = p_payload->>'idempotencyKey';
  IF FOUND THEN
    IF existing_record.request_fingerprint = request_fingerprint THEN
      RETURN existing_record.id;
    END IF;
    RAISE EXCEPTION 'DUPLICATE_TRANSACTION:idempotency key payload mismatch' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.finance_payments
    WHERE source_system = p_payload->>'sourceSystem'
      AND source_account_ref = p_payload->>'sourceAccountRef'
      AND source_transaction_id = p_payload->>'sourceTransactionId'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_TRANSACTION:source transaction already recorded' USING ERRCODE = '23505';
  END IF;

  FOR allocation_entry IN
    SELECT jsonb_build_object(
      'allowanceItemId', entry.value->>'allowanceItemId',
      'amount', sum((entry.value->>'amount')::NUMERIC)
    )
    FROM jsonb_array_elements(p_payload->'allocations') entry(value)
    GROUP BY entry.value->>'allowanceItemId'
    ORDER BY entry.value->>'allowanceItemId'
  LOOP
    SELECT item.id, item.net_amount, item.recipient_user_id, batch.project_id, batch.status
    INTO item_row
    FROM public.finance_allowance_items item
    JOIN public.finance_allowance_batches batch ON batch.id = item.batch_id
    WHERE item.id = (allocation_entry->>'allowanceItemId')::UUID
    FOR UPDATE OF item;
    IF NOT FOUND OR item_row.project_id <> p_project_id OR item_row.status <> 'confirmed' THEN
      RAISE EXCEPTION 'payment allocation must reference a current confirmed project allowance' USING ERRCODE = '23514';
    END IF;
    IF NULLIF(p_payload->>'recipientUserId', '') IS NOT NULL
       AND item_row.recipient_user_id <> (p_payload->>'recipientUserId')::UUID THEN
      RAISE EXCEPTION 'payment recipient does not match allowance recipient' USING ERRCODE = '23514';
    END IF;
    IF p_payload->>'status' = 'executed' THEN
      SELECT COALESCE(sum(allocation.amount), 0) INTO prior_paid
      FROM public.finance_payment_allocations allocation
      JOIN public.finance_payments payment ON payment.id = allocation.payment_id
      WHERE allocation.allowance_item_id = item_row.id AND payment.status = 'executed';
      IF prior_paid + (allocation_entry->>'amount')::NUMERIC > item_row.net_amount THEN
        RAISE EXCEPTION 'ALLOCATION_EXCEEDED:allowance net amount' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END LOOP;

  IF NULLIF(p_payload->>'evidenceRef', '') IS NOT NULL THEN
    INSERT INTO public.finance_evidence(project_id, kind, reference_value, source_system, source_id, created_by)
    VALUES (p_project_id, 'payment', p_payload->>'evidenceRef', p_payload->>'sourceSystem',
      p_payload->>'sourceTransactionId', p_actor_user_id) RETURNING id INTO evidence_row_id;
  END IF;
  INSERT INTO public.finance_payments(
    idempotency_key, request_fingerprint, source_system, source_account_ref, source_transaction_id,
    source_owned_by, recipient_user_id, amount, currency, paid_at, status,
    evidence_id, recorded_by
  ) VALUES (
    p_payload->>'idempotencyKey', request_fingerprint, p_payload->>'sourceSystem', p_payload->>'sourceAccountRef',
    p_payload->>'sourceTransactionId', NULLIF(p_payload->>'sourceOwnedBy', ''),
    (p_payload->>'recipientUserId')::UUID, (p_payload->>'amount')::NUMERIC,
    p_payload->>'currency', NULLIF(p_payload->>'paidAt', '')::TIMESTAMPTZ,
    p_payload->>'status', evidence_row_id, p_actor_user_id
  ) RETURNING id INTO payment_id;
  INSERT INTO public.finance_payment_allocations(payment_id, allowance_item_id, amount)
  SELECT payment_id, (entry.value->>'allowanceItemId')::UUID, (entry.value->>'amount')::NUMERIC
  FROM jsonb_array_elements(p_payload->'allocations') entry(value);
  PERFORM public.finance_audit(p_project_id, p_actor_user_id, 'payment.recorded',
    'payment', payment_id, NULL, (p_payload - 'evidenceRef') - 'allocations', NULL);
  RETURN payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_prevent_final_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'final finance records are immutable; add a correction record' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER finance_receipts_immutable
  BEFORE UPDATE OR DELETE ON public.finance_receipts
  FOR EACH ROW EXECUTE FUNCTION public.finance_prevent_final_mutation();
CREATE TRIGGER finance_receipt_allocations_immutable
  BEFORE UPDATE OR DELETE ON public.finance_receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION public.finance_prevent_final_mutation();
CREATE TRIGGER finance_payments_immutable
  BEFORE UPDATE OR DELETE ON public.finance_payments
  FOR EACH ROW EXECUTE FUNCTION public.finance_prevent_final_mutation();
CREATE TRIGGER finance_payment_allocations_immutable
  BEFORE UPDATE OR DELETE ON public.finance_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.finance_prevent_final_mutation();

CREATE OR REPLACE FUNCTION public.finance_protect_confirmed_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE protected_batch_id UUID := COALESCE(OLD.batch_id, NEW.batch_id);
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.finance_allowance_batches batch
    WHERE batch.id = protected_batch_id AND batch.status IN ('confirmed', 'superseded')
  ) THEN
    RAISE EXCEPTION 'confirmed allowance items are immutable; create a new batch version' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_allowance_items_protect_confirmed
  BEFORE UPDATE OR DELETE ON public.finance_allowance_items
  FOR EACH ROW EXECUTE FUNCTION public.finance_protect_confirmed_item();

ALTER TABLE public.finance_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_project_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_allowance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_allowance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_grants_self_or_global_select ON public.finance_access_grants
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.finance_is_global((SELECT auth.uid())));
CREATE POLICY finance_settings_global_select ON public.finance_settings
  FOR SELECT TO authenticated USING (public.finance_is_global((SELECT auth.uid())));
CREATE POLICY project_finance_authorized_select ON public.project_finance
  FOR SELECT TO authenticated
  USING (public.finance_can_manage_project((SELECT auth.uid()), project_id));
CREATE POLICY finance_managers_authorized_select ON public.finance_project_managers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.finance_is_global((SELECT auth.uid())));
CREATE POLICY finance_evidence_authorized_select ON public.finance_evidence
  FOR SELECT TO authenticated
  USING (public.finance_can_manage_project((SELECT auth.uid()), project_id));
CREATE POLICY finance_batches_authorized_select ON public.finance_allowance_batches
  FOR SELECT TO authenticated
  USING (
    public.finance_can_manage_project((SELECT auth.uid()), project_id)
    OR public.finance_is_confirmed_recipient((SELECT auth.uid()), id, NULL)
  );
CREATE POLICY finance_items_authorized_select ON public.finance_allowance_items
  FOR SELECT TO authenticated
  USING (
    public.finance_is_confirmed_recipient((SELECT auth.uid()), batch_id, id)
    OR EXISTS (
      SELECT 1 FROM public.finance_allowance_batches batch
      WHERE batch.id = batch_id
        AND public.finance_can_manage_project((SELECT auth.uid()), batch.project_id)
    )
  );
CREATE POLICY finance_receipts_authorized_select ON public.finance_receipts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.finance_receipt_allocations allocation
    WHERE allocation.receipt_id = finance_receipts.id
      AND public.finance_can_manage_project((SELECT auth.uid()), allocation.project_id)
  ));
CREATE POLICY finance_receipt_allocations_authorized_select ON public.finance_receipt_allocations
  FOR SELECT TO authenticated
  USING (public.finance_can_manage_project((SELECT auth.uid()), project_id));
CREATE POLICY finance_payments_authorized_select ON public.finance_payments
  FOR SELECT TO authenticated
  USING (public.finance_can_manage_payment((SELECT auth.uid()), id));
CREATE POLICY finance_payment_allocations_authorized_select ON public.finance_payment_allocations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.finance_allowance_items item
    JOIN public.finance_allowance_batches batch ON batch.id = item.batch_id
    WHERE item.id = allowance_item_id
      AND (
        public.finance_can_manage_project((SELECT auth.uid()), batch.project_id)
        OR (batch.status = 'confirmed' AND item.recipient_user_id = (SELECT auth.uid()))
      )
  ));
CREATE POLICY finance_audit_authorized_select ON public.finance_audit_events
  FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.finance_can_manage_project((SELECT auth.uid()), project_id));

CREATE POLICY projects_confirmed_finance_recipient_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.finance_can_view_project((SELECT auth.uid()), id));

REVOKE ALL ON public.finance_access_grants, public.finance_settings, public.project_finance,
  public.finance_project_managers, public.finance_evidence, public.finance_allowance_batches,
  public.finance_allowance_items, public.finance_receipts, public.finance_receipt_allocations,
  public.finance_payments, public.finance_payment_allocations, public.finance_audit_events
  FROM anon;
GRANT SELECT ON public.finance_access_grants, public.finance_settings, public.project_finance,
  public.finance_project_managers, public.finance_evidence, public.finance_allowance_batches,
  public.finance_allowance_items, public.finance_receipts, public.finance_receipt_allocations,
  public.finance_payments, public.finance_payment_allocations, public.finance_audit_events
  TO authenticated;
GRANT ALL ON public.finance_access_grants, public.finance_settings, public.project_finance,
  public.finance_project_managers, public.finance_evidence, public.finance_allowance_batches,
  public.finance_allowance_items, public.finance_receipts, public.finance_receipt_allocations,
  public.finance_payments, public.finance_payment_allocations, public.finance_audit_events
  TO service_role;

REVOKE ALL ON FUNCTION public.finance_assert_actor(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_audit(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_is_global(UUID), public.finance_can_manage_project(UUID, UUID),
  public.finance_can_view_project(UUID, UUID), public.finance_is_confirmed_recipient(UUID, UUID, UUID),
  public.finance_can_manage_payment(UUID, UUID), public.finance_get_my_payment_allocations(UUID),
  public.finance_get_my_pending_confirmation_count(UUID), public.finance_get_my_project_currency(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_is_global(UUID), public.finance_can_manage_project(UUID, UUID),
  public.finance_can_view_project(UUID, UUID), public.finance_is_confirmed_recipient(UUID, UUID, UUID),
  public.finance_can_manage_payment(UUID, UUID), public.finance_get_my_payment_allocations(UUID),
  public.finance_get_my_pending_confirmation_count(UUID), public.finance_get_my_project_currency(UUID, UUID)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.finance_upsert_project_budget(UUID, UUID, INTEGER, JSONB),
  public.finance_set_project_managers(UUID, UUID, INTEGER, JSONB, TEXT),
  public.finance_save_allowance_draft(UUID, UUID, INTEGER, JSONB, TEXT),
  public.finance_submit_allowance_batch(UUID, UUID, INTEGER, TEXT),
  public.finance_confirm_allowance_batch(UUID, UUID, INTEGER, TEXT),
  public.finance_record_receipt(UUID, UUID, JSONB),
  public.finance_record_payment(UUID, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_upsert_project_budget(UUID, UUID, INTEGER, JSONB),
  public.finance_set_project_managers(UUID, UUID, INTEGER, JSONB, TEXT),
  public.finance_save_allowance_draft(UUID, UUID, INTEGER, JSONB, TEXT),
  public.finance_submit_allowance_batch(UUID, UUID, INTEGER, TEXT),
  public.finance_confirm_allowance_batch(UUID, UUID, INTEGER, TEXT),
  public.finance_record_receipt(UUID, UUID, JSONB),
  public.finance_record_payment(UUID, UUID, JSONB)
  TO authenticated, service_role;

-- Legacy payouts remain history only. Generic owner/admin no longer implies finance access.
DROP POLICY IF EXISTS payouts_admin_all ON public.payouts;
DROP POLICY IF EXISTS payouts_self_select ON public.payouts;
CREATE POLICY payouts_explicit_finance_or_self_select ON public.payouts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.finance_can_manage_project((SELECT auth.uid()), project_id)
  );
REVOKE INSERT, UPDATE, DELETE ON public.payouts FROM authenticated;

COMMIT;
