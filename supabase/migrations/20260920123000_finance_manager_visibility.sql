-- Follow-up to finance_ledger_20260920.
-- A project finance manager may see the complete manager assignment for that
-- same project, but never assignments for projects outside their scope.

BEGIN;

DROP POLICY IF EXISTS finance_managers_authorized_select ON public.finance_project_managers;
CREATE POLICY finance_managers_authorized_select ON public.finance_project_managers
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.finance_can_manage_project((SELECT auth.uid()), project_id)
  );

COMMIT;
