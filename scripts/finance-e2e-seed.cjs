/*
 * Creates only the private, synthetic finance E2E fixture records.
 *
 * Run through the approved private launcher after the finance migration:
 *   node .../run.cjs node scripts/finance-e2e-seed.cjs
 *
 * It never reads or changes non-fixture finance records, sends no notification,
 * and deliberately does not derive a finance amount from projects.fee.
 */
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const fixturePath = process.env.FINANCE_E2E_FIXTURE_PATH;
if (!fixturePath) throw new Error("FINANCE_E2E_FIXTURE_PATH is required");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("private Supabase service credentials are required");
}

const fixture = JSON.parse(fs.readFileSync(path.resolve(fixturePath), "utf8"));
if (fixture.financeSeededAt) {
  console.log(JSON.stringify({ skipped: true, reason: "fixture already seeded" }));
  process.exit(0);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function required(pathText) {
  const value = pathText.split(".").reduce((obj, key) => obj?.[key], fixture);
  if (!value) throw new Error(`fixture is missing ${pathText}`);
  return value;
}

function check(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

async function main() {
  const runId = required("runId");
  const ceo = required("users.ceo");
  const finance = required("users.finance");
  const manager = required("users.manager");
  const coManager = required("users.co_manager");
  const member = required("users.member");
  const other = required("users.other");
  const primary = required("projects.primary");
  const secondary = required("projects.secondary");
  const month = new Date().toISOString().slice(0, 7);

  // Non-round, per-run synthetic values make accidental disclosure obvious in tests.
  const primaryBudget = 970011;
  const secondaryBudget = 870022;
  const memberAllowance = 315123;
  const otherAllowance = 208234;

  check(
    await db.from("finance_access_grants").upsert(
      [
        { user_id: ceo.id, role: "ceo", granted_by: ceo.id, reason: `E2E ${runId}` },
        { user_id: finance.id, role: "finance", granted_by: ceo.id, reason: `E2E ${runId}` },
      ],
      { onConflict: "user_id,role" }
    ),
    "upsert global finance grants"
  );

  check(
    await db.from("project_finance").upsert(
      [
        {
          project_id: primary.id,
          currency: "KRW",
          budget_amount: primaryBudget,
          contract_total_amount: primaryBudget,
          contract_amount_basis: "total_only",
          client_name: `[E2E ${runId}] primary`,
          updated_by: ceo.id,
        },
        {
          project_id: secondary.id,
          currency: "KRW",
          budget_amount: secondaryBudget,
          contract_total_amount: secondaryBudget,
          contract_amount_basis: "total_only",
          client_name: `[E2E ${runId}] secondary`,
          updated_by: ceo.id,
        },
      ],
      { onConflict: "project_id" }
    ),
    "upsert synthetic project finance"
  );

  // New projects inherit the real default finance lead via a DB trigger.
  // Replace it through the audited, versioned RPC so this fixture never exposes
  // a synthetic project's amounts to an unrelated real manager.
  for (const [project, assigned] of [
    [primary, manager],
    [secondary, coManager],
  ]) {
    const financeRow = check(
      await db.from("project_finance").select("version").eq("project_id", project.id).single(),
      "read synthetic project finance version"
    );
    check(
      await db.rpc("finance_set_project_managers", {
        p_actor_user_id: ceo.id,
        p_project_id: project.id,
        p_expected_version: financeRow.version,
        p_managers: [{ crewMemberId: assigned.crewMemberId, isPrimary: true }],
        p_reason: `E2E ${runId} isolated manager assignment`,
      }),
      "replace synthetic project manager assignment"
    );
  }

  const initialBatches = check(
    await db
      .from("finance_allowance_batches")
      .insert([
        {
          project_id: primary.id,
          version: 1,
          revision: 2,
          status: "confirmed",
          created_by: ceo.id,
          confirmed_by: ceo.id,
          confirmed_at: new Date().toISOString(),
        },
        {
          project_id: secondary.id,
          version: 1,
          revision: 2,
          status: "confirmed",
          created_by: ceo.id,
          confirmed_by: ceo.id,
          confirmed_at: new Date().toISOString(),
        },
      ])
      .select("id,project_id"),
    "insert initial confirmed allowance batches"
  );
  const batchByProject = new Map(initialBatches.map((row) => [row.project_id, row.id]));
  check(
    await db.from("finance_allowance_items").insert([
      {
        batch_id: batchByProject.get(primary.id),
        recipient_user_id: member.id,
        recipient_crew_member_id: member.crewMemberId,
        category: "synthetic",
        reason: `E2E confirmed allowance ${runId}`,
        gross_amount: memberAllowance,
        tax_type: "none",
        taxable_amount: memberAllowance,
        income_tax_amount: 0,
        local_income_tax_amount: 0,
        deduction_amount: 0,
        net_amount: memberAllowance,
        tax_policy_version: "e2e-none-v1",
        evidence_reference: `e2e://${runId}/primary/allowance`,
      },
      {
        batch_id: batchByProject.get(secondary.id),
        recipient_user_id: other.id,
        recipient_crew_member_id: other.crewMemberId,
        category: "synthetic",
        reason: `E2E confirmed allowance ${runId}`,
        gross_amount: otherAllowance,
        tax_type: "none",
        taxable_amount: otherAllowance,
        income_tax_amount: 0,
        local_income_tax_amount: 0,
        deduction_amount: 0,
        net_amount: otherAllowance,
        tax_policy_version: "e2e-none-v1",
        evidence_reference: `e2e://${runId}/secondary/allowance`,
      },
    ]),
    "insert initial confirmed allowance items"
  );

  fixture.month = month;
  fixture.projects.primary.budgetAmount = primaryBudget;
  fixture.projects.secondary.budgetAmount = secondaryBudget;
  fixture.allowances = {
    member: { grossAmount: memberAllowance },
    other: { grossAmount: otherAllowance },
  };
  fixture.financeSeededAt = new Date().toISOString();
  fs.writeFileSync(path.resolve(fixturePath), `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(JSON.stringify({ seeded: true, runId, projectIds: [primary.id, secondary.id] }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
