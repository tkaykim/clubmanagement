-- Follow-up to finance_ledger_20260920.
-- Do not let a second browser save wait behind an in-flight draft save.
-- PostgreSQL returns SQLSTATE 55P03, which the API translates to HTTP 409.

BEGIN;

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
  WHERE finance_row.project_id = p_project_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'project finance record not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO batch_row
  FROM public.finance_allowance_batches
  WHERE finance_allowance_batches.project_id = p_project_id AND status IN ('draft', 'rejected')
  FOR UPDATE NOWAIT;

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
   AND member.is_active = true;
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

COMMIT;
