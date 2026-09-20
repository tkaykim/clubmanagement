import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

let modulePath = process.env.PGLITE_IMPORT;
if (!modulePath) {
  try {
    modulePath = await import.meta.resolve("@electric-sql/pglite");
  } catch {
    throw new Error(
      "PGlite is not installed. Install @electric-sql/pglite temporarily or set PGLITE_IMPORT to its module path."
    );
  }
}
const { PGlite } = await import(modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href);
const db = new PGlite();

const ids = {
  global: "10000000-0000-4000-8000-000000000001",
  owner: "10000000-0000-4000-8000-000000000002",
  manager: "10000000-0000-4000-8000-000000000003",
  member: "10000000-0000-4000-8000-000000000004",
  coManager: "10000000-0000-4000-8000-000000000005",
  managerCrew: "20000000-0000-4000-8000-000000000003",
  memberCrew: "20000000-0000-4000-8000-000000000004",
  coManagerCrew: "20000000-0000-4000-8000-000000000005",
  project: "30000000-0000-4000-8000-000000000001",
  unbudgetedProject: "30000000-0000-4000-8000-000000000002",
};

await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')
  $$;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated, service_role;

  CREATE TABLE public.users(id uuid PRIMARY KEY, email text, name text);
  CREATE TABLE public.crew_members(
    id uuid PRIMARY KEY, user_id uuid, name text NOT NULL, stage_name text,
    profile_image_url text, is_active boolean NOT NULL DEFAULT true
  );
  CREATE TABLE public.projects(
    id uuid PRIMARY KEY, owner_id uuid NOT NULL, title text NOT NULL, fee integer NOT NULL DEFAULT 0
  );
  CREATE TABLE public.payouts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
    user_id uuid, amount integer NOT NULL DEFAULT 0
  );
  ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY payouts_admin_all ON public.payouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY payouts_self_select ON public.payouts FOR SELECT TO authenticated USING (user_id = auth.uid());
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;

  INSERT INTO auth.users VALUES
    ('${ids.global}', 'finance@example.test'), ('${ids.owner}', 'owner@example.test'),
    ('${ids.manager}', 'manager@example.test'), ('${ids.member}', 'member@example.test'),
    ('${ids.coManager}', 'co-manager@example.test');
  INSERT INTO public.users VALUES
    ('${ids.owner}', 'owner@example.test', 'Owner'),
    ('${ids.manager}', 'manager@example.test', 'Manager'),
    ('${ids.member}', 'member@example.test', 'Member'),
    ('${ids.coManager}', 'co-manager@example.test', 'Co-manager');
  INSERT INTO public.crew_members VALUES
    ('${ids.managerCrew}', '${ids.manager}', 'Manager', NULL, NULL, true),
    ('${ids.memberCrew}', '${ids.member}', 'Member', NULL, NULL, true),
    ('${ids.coManagerCrew}', '${ids.coManager}', 'Co-manager', NULL, NULL, true);
  INSERT INTO public.projects VALUES
    ('${ids.project}', '${ids.owner}', 'Finance Test', 0),
    ('${ids.unbudgetedProject}', '${ids.owner}', 'Unbudgeted Finance Test', 0);
`);

const migration = await readFile(
  new URL("../../supabase/migrations/20260920120000_finance_ledger.sql", import.meta.url),
  "utf8"
);
await db.exec(migration);
const managerVisibilityMigration = await readFile(
  new URL("../../supabase/migrations/20260920123000_finance_manager_visibility.sql", import.meta.url),
  "utf8"
);
await db.exec(managerVisibilityMigration);
const draftLockMigration = await readFile(
  new URL("../../supabase/migrations/20260920124500_finance_draft_lock_nowait.sql", import.meta.url),
  "utf8"
);
await db.exec(draftLockMigration);
const archiveMigration = await readFile(
  new URL("../../supabase/migrations/20260920130000_finance_project_archive.sql", import.meta.url),
  "utf8"
);
await db.exec(archiveMigration);

await db.query(
  `INSERT INTO public.finance_access_grants(user_id, role, reason) VALUES ($1, 'finance', 'test')`,
  [ids.global]
);

async function asUser(userId, sql, params = []) {
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await db.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`RESET ROLE`);
  }
}

async function asRole(role, userId, sql, params = []) {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  await db.query(`SELECT set_config('request.jwt.claim.role', $1, false)`, [role]);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`RESET ROLE`);
  }
}

const globalCheck = await asUser(ids.global, `SELECT public.finance_is_global($1) value`, [ids.global]);
assert.equal(globalCheck.rows[0].value, true, "global grant works without crew membership");

const ownerRows = await asUser(ids.owner, `SELECT * FROM public.project_finance`);
assert.equal(ownerRows.rows.length, 0, "ungranted owner cannot read private finance");
await assert.rejects(
  () => asRole("anon", null, `SELECT * FROM public.project_finance`),
  /permission denied/i,
  "anon has no finance table access"
);
await assert.rejects(
  () => asRole("anon", null, `SELECT public.finance_is_global($1)`, [ids.global]),
  /permission denied/i,
  "anon cannot call finance helper functions"
);
await assert.rejects(
  () => asUser(ids.owner, `INSERT INTO public.finance_access_grants(user_id, role) VALUES ($1, 'finance')`, [ids.owner]),
  /permission denied|row-level security/i,
  "users cannot self-grant finance"
);

await asUser(
  ids.global,
  `SELECT * FROM public.finance_set_project_managers($1,$2,0,$3::jsonb,'assign')`,
  [ids.global, ids.project, JSON.stringify([{ crewMemberId: ids.managerCrew, isPrimary: true }])]
);
const managerRows = await asUser(ids.manager, `SELECT * FROM public.project_finance WHERE project_id=$1`, [ids.project]);
assert.equal(managerRows.rows.length, 1, "assigned manager can read project finance");
await asUser(ids.global, `SELECT * FROM public.finance_set_project_managers($1,$2,1,'[]'::jsonb,'revoke')`, [ids.global, ids.project]);
const revokedRows = await asUser(ids.manager, `SELECT * FROM public.project_finance WHERE project_id=$1`, [ids.project]);
assert.equal(revokedRows.rows.length, 0, "manager revocation is immediate");

await asUser(ids.global, `SELECT * FROM public.finance_set_project_managers($1,$2,2,$3::jsonb,'reassign')`, [
  ids.global, ids.project, JSON.stringify([
    { crewMemberId: ids.managerCrew, isPrimary: true },
    { crewMemberId: ids.coManagerCrew, isPrimary: false },
  ]),
]);
const coManagerRows = await asUser(ids.coManager, `SELECT user_id FROM public.finance_project_managers WHERE project_id=$1`, [ids.project]);
assert.equal(coManagerRows.rows.length, 2, "a manager can read co-manager assignments for the same project");
const unassignedManagerRows = await asUser(ids.owner, `SELECT user_id FROM public.finance_project_managers WHERE project_id=$1`, [ids.project]);
assert.equal(unassignedManagerRows.rows.length, 0, "an unassigned user cannot read manager assignments");
await asUser(ids.global, `SELECT * FROM public.finance_set_project_managers($1,$2,0,$3::jsonb,'assign')`, [
  ids.global, ids.unbudgetedProject, JSON.stringify([{ crewMemberId: ids.managerCrew, isPrimary: true }]),
]);
const unbudgetedDraft = await asUser(ids.manager, `SELECT * FROM public.finance_save_allowance_draft($1,$2,NULL,$3::jsonb,'draft')`, [
  ids.manager, ids.unbudgetedProject,
  JSON.stringify([{ recipientUserId: ids.member, category: "performance", reason: "show", grossAmount: 100000, taxType: "none" }]),
]);
await asUser(ids.manager, `SELECT * FROM public.finance_submit_allowance_batch($1,$2,$3,'submit')`, [
  ids.manager, ids.unbudgetedProject, unbudgetedDraft.rows[0].revision,
]);
await assert.rejects(
  () => asUser(ids.global, `SELECT * FROM public.finance_confirm_allowance_batch($1,$2,2,'confirm')`, [ids.global, ids.unbudgetedProject]),
  /project budget must be configured before confirmation/,
  "an unconfigured budget cannot silently approve an unlimited allowance"
);
await asUser(ids.global, `SELECT * FROM public.finance_upsert_project_budget($1,$2,3,$3::jsonb)`, [
  ids.global,
  ids.project,
  JSON.stringify({
    currency: "KRW", budgetAmount: 4000000, contractSupplyAmount: 3000000,
    contractVatAmount: 300000, contractTotalAmount: 3300000,
    contractAmountBasis: "supply_vat", reason: "test budget",
  }),
]);
await assert.rejects(
  () => asUser(ids.global, `SELECT * FROM public.finance_upsert_project_budget($1,$2,3,$3::jsonb)`, [ids.global, ids.project, JSON.stringify({ currency: "KRW", contractAmountBasis: "undecided", reason: "stale" })]),
  /VERSION_CONFLICT:4/,
  "stale budget version is rejected"
);

const draft = await asUser(ids.manager, `SELECT * FROM public.finance_save_allowance_draft($1,$2,NULL,$3::jsonb,'draft')`, [
  ids.manager,
  ids.project,
  JSON.stringify([{ recipientUserId: ids.member, category: "performance", reason: "show", grossAmount: 300000, taxType: "business_income_3_3" }]),
]);
assert.equal(draft.rows[0].revision, 1);
const memberDraft = await asUser(ids.member, `SELECT * FROM public.finance_allowance_items`);
assert.equal(memberDraft.rows.length, 0, "member cannot see draft amounts");
await asUser(ids.manager, `SELECT * FROM public.finance_submit_allowance_batch($1,$2,1,'submit')`, [ids.manager, ids.project]);
await asUser(ids.global, `SELECT * FROM public.finance_confirm_allowance_batch($1,$2,2,'confirm')`, [ids.global, ids.project]);
const memberConfirmed = await asUser(ids.member, `SELECT gross_amount,deduction_amount,net_amount FROM public.finance_allowance_items`);
assert.deepEqual(memberConfirmed.rows[0], { gross_amount: "300000.00", deduction_amount: "9900.00", net_amount: "290100.00" });

const itemId = (await db.query(`
  SELECT item.id
  FROM public.finance_allowance_items item
  JOIN public.finance_allowance_batches batch ON batch.id = item.batch_id
  WHERE batch.project_id = $1 AND batch.status = 'confirmed'
`, [ids.project])).rows[0].id;
const paymentPayload = {
  idempotencyKey: "payment-test-0001", sourceSystem: "bank", sourceAccountRef: "acct-1",
  sourceTransactionId: "tx-1", amount: 100000, currency: "KRW",
  paidAt: "2026-09-20T01:00:00+00:00", recipientUserId: ids.member,
  status: "executed", evidenceRef: "bank-proof-1",
  allocations: [{ allowanceItemId: itemId, amount: 100000 }],
};
const paid1 = await asUser(ids.global, `SELECT public.finance_record_payment($1,$2,$3::jsonb) id`, [ids.global, ids.project, JSON.stringify(paymentPayload)]);
const paid2 = await asUser(ids.global, `SELECT public.finance_record_payment($1,$2,$3::jsonb) id`, [ids.global, ids.project, JSON.stringify(paymentPayload)]);
assert.equal(paid1.rows[0].id, paid2.rows[0].id, "same idempotency payload returns same payment");
assert.equal((await db.query(`SELECT count(*)::int count FROM public.finance_payments`)).rows[0].count, 1);

await assert.rejects(
  () => asUser(ids.global, `SELECT public.finance_record_payment($1,$2,$3::jsonb)`, [ids.global, ids.project, JSON.stringify({
    ...paymentPayload, idempotencyKey: "payment-pending-0001", sourceTransactionId: "tx-pending", status: "pending",
  })]),
  /pending transactions are not recorded as immutable evidence/,
  "pending payments cannot enter an immutable ledger"
);
await assert.rejects(
  () => asUser(ids.global, `SELECT public.finance_record_payment($1,$2,$3::jsonb)`, [ids.global, ids.project, JSON.stringify({
    ...paymentPayload, idempotencyKey: "payment-duplicate-0001", sourceTransactionId: "tx-duplicate", amount: 200000,
    allocations: [{ allowanceItemId: itemId, amount: 100000 }, { allowanceItemId: itemId, amount: 100000 }],
  })]),
  /duplicate payment allowance allocations are not allowed/,
  "a payment cannot allocate the same allowance item twice"
);
await assert.rejects(
  () => asUser(ids.global, `SELECT public.finance_record_receipt($1,$2,$3::jsonb)`, [ids.global, ids.project, JSON.stringify({
    idempotencyKey: "receipt-currency-0001", sourceSystem: "bank", sourceAccountRef: "acct-1", sourceTransactionId: "rcpt-1",
    amount: 100, currency: "USD", status: "executed", receivedAt: "2026-09-20T01:00:00+00:00", evidenceRef: "proof",
  })]),
  /transaction currency must match project currency/,
  "ledger transactions must use the project currency"
);
await assert.rejects(
  () => db.query(`UPDATE public.finance_payments SET status='failed' WHERE id=$1`, [paid1.rows[0].id]),
  /final finance records are immutable/,
  "even a database owner cannot mutate a recorded payment"
);
await assert.rejects(
  () => asUser(ids.manager, `SELECT public.finance_record_payment($1,$2,$3::jsonb)`, [ids.manager, ids.project, JSON.stringify({
    ...paymentPayload, idempotencyKey: "manager-payment-0001", sourceTransactionId: "tx-manager",
  })]),
  /global finance permission required/,
  "a project manager cannot record payments"
);
const replacementDraft = await asUser(ids.manager, `SELECT * FROM public.finance_save_allowance_draft($1,$2,NULL,$3::jsonb,'revision')`, [
  ids.manager, ids.project,
  JSON.stringify([{ recipientUserId: ids.member, category: "performance", reason: "adjust", grossAmount: 300000, taxType: "business_income_3_3" }]),
]);
await asUser(ids.manager, `SELECT * FROM public.finance_submit_allowance_batch($1,$2,$3,'submit')`, [ids.manager, ids.project, replacementDraft.rows[0].revision]);
await assert.rejects(
  () => asUser(ids.global, `SELECT * FROM public.finance_confirm_allowance_batch($1,$2,2,'confirm')`, [ids.global, ids.project]),
  /cannot replace a confirmed allowance batch after payment/,
  "a paid confirmed batch cannot be superseded without adjustment accounting"
);
const currentBatch = await db.query(`SELECT status FROM public.finance_allowance_batches WHERE project_id=$1 AND version=1`, [ids.project]);
assert.equal(currentBatch.rows[0].status, "confirmed", "failed revision leaves paid history current and visible");

await asUser(ids.global, `SELECT public.finance_set_project_archive($1,$2,true,'synthetic fixture quarantine')`, [ids.global, ids.unbudgetedProject]);
const activeFinanceProjects = await asUser(
  ids.global,
  `SELECT project_id FROM public.project_finance WHERE archived_at IS NULL ORDER BY project_id`
);
assert.equal(
  activeFinanceProjects.rows.some((row) => row.project_id === ids.unbudgetedProject),
  false,
  "archived synthetic finance is excluded from the active-list predicate"
);
const archivedDetail = await asUser(
  ids.global,
  `SELECT project_id FROM public.project_finance WHERE project_id=$1`,
  [ids.unbudgetedProject]
);
assert.equal(archivedDetail.rows.length, 1, "archiving preserves authorized detail and audit history");

console.log("finance migration PGlite: PASS");
await db.close();
