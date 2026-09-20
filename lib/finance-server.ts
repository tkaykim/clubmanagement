import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { deriveFinancePaymentStatus } from "@/lib/finance";
import type {
  FinanceAllowanceItem,
  FinanceApiErrorCode,
  FinanceManager,
  FinanceMySettlement,
  FinanceMySettlementsResponse,
  FinanceProjectDetail,
  FinanceProjectSummary,
  FinanceReceipt,
  FinancePayment,
} from "@/lib/finance-types";

export type FinanceIdentity = {
  userId: string;
  email: string;
  isGlobal: boolean;
  managedProjectIds: string[];
};

type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null };
type FinanceMemberDirectoryRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  stage_name: string | null;
  profile_image_url: string | null;
  is_active: boolean;
};

function money(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export async function getFinanceIdentity(): Promise<FinanceIdentity | null> {
  const session = await getSession();
  if (!session) return null;
  const supabase = createRouteSupabaseClient();
  const [{ data: isGlobalData }, { data: managerRows }] = await Promise.all([
    supabase.rpc("finance_is_global", { p_user_id: session.userId }),
    supabase
      .from("finance_project_managers")
      .select("project_id")
      .eq("user_id", session.userId),
  ]);
  return {
    userId: session.userId,
    email: session.email,
    isGlobal: isGlobalData === true,
    managedProjectIds: Array.from(
      new Set(((managerRows ?? []) as Array<{ project_id: string }>).map((row) => row.project_id))
    ),
  };
}

export async function requireFinanceIdentity(options?: {
  global?: boolean;
  projectId?: string;
  allowMember?: boolean;
}): Promise<FinanceIdentity | NextResponse> {
  const identity = await getFinanceIdentity();
  if (!identity) {
    return financeApiError(401, "UNAUTHENTICATED", "인증이 필요합니다");
  }
  if (options?.global && !identity.isGlobal) {
    return financeApiError(403, "FORBIDDEN", "전역 재무 권한이 필요합니다");
  }
  if (
    options?.projectId &&
    !identity.isGlobal &&
    !identity.managedProjectIds.includes(options.projectId) &&
    !options.allowMember
  ) {
    return financeApiError(403, "FORBIDDEN", "이 프로젝트의 재무 권한이 없습니다");
  }
  return identity;
}

export function financeApiError(
  status: number,
  code: FinanceApiErrorCode,
  error: string,
  extra?: { details?: unknown; currentVersion?: number }
) {
  return financeJson({ error, code, ...extra }, status);
}

/** Private ledger JSON must never be placed in a shared HTTP cache. */
export function financeJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
    },
  });
}

export function financeDbError(error: DbError | null | undefined): NextResponse {
  const message = error?.message ?? "재무 처리 중 오류가 발생했습니다";
  if (error?.code === "55P03") {
    return financeApiError(409, "VERSION_CONFLICT", "다른 사용자가 먼저 수정 중입니다");
  }
  const version = /VERSION_CONFLICT:(\d+)/.exec(message);
  if (version) {
    return financeApiError(409, "VERSION_CONFLICT", "다른 사용자가 먼저 수정했습니다", {
      currentVersion: Number(version[1]),
    });
  }
  if (message.includes("DUPLICATE_TRANSACTION") || error?.code === "23505") {
    return financeApiError(409, "DUPLICATE_TRANSACTION", "이미 등록된 거래입니다");
  }
  if (message.includes("BUDGET_EXCEEDED")) {
    return financeApiError(409, "BUDGET_EXCEEDED", "배분액이 프로젝트 예산을 초과합니다");
  }
  if (message.includes("ALLOCATION_EXCEEDED")) {
    return financeApiError(409, "ALLOCATION_EXCEEDED", "배부액이 허용 금액을 초과합니다");
  }
  if (error?.code === "42501") {
    return financeApiError(403, "FORBIDDEN", "재무 작업 권한이 없습니다");
  }
  if (error?.code === "P0002") {
    return financeApiError(404, "NOT_FOUND", "재무 기록을 찾을 수 없습니다");
  }
  if (["22023", "23514"].includes(error?.code ?? "")) {
    return financeApiError(400, "VALIDATION_ERROR", message);
  }
  if (error?.code === "55000" || message.includes("no submitted") || message.includes("no draft")) {
    return financeApiError(409, "INVALID_STATE", message);
  }
  return financeApiError(500, "INTERNAL_ERROR", "재무 처리 중 오류가 발생했습니다");
}

async function loadFinanceMemberDirectory(
  supabase: SupabaseClient,
  identity: Pick<FinanceIdentity, "userId">
): Promise<{ byCrewMemberId: Map<string, FinanceMemberDirectoryRow>; byUserId: Map<string, FinanceMemberDirectoryRow> }> {
  // The actor always comes from the authenticated server-side finance identity.
  // Never accept an arbitrary user id from a request body or query string here.
  const { data, error } = await supabase.rpc("finance_get_member_directory", {
    p_actor_user_id: identity.userId,
  });
  if (error) throw new Error("finance member directory lookup failed");
  const byCrewMemberId = new Map<string, FinanceMemberDirectoryRow>();
  const byUserId = new Map<string, FinanceMemberDirectoryRow>();
  for (const row of (data ?? []) as FinanceMemberDirectoryRow[]) {
    byCrewMemberId.set(row.id, row);
    if (row.user_id) byUserId.set(row.user_id, row);
  }
  return { byCrewMemberId, byUserId };
}

async function loadManagers(
  supabase: SupabaseClient,
  projectId: string,
  memberDirectory: Awaited<ReturnType<typeof loadFinanceMemberDirectory>>
): Promise<FinanceManager[]> {
  const { data: rows } = await supabase
    .from("finance_project_managers")
    .select("id,user_id,crew_member_id,is_primary,assigned_at")
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: true });
  const managers = (rows ?? []) as Array<Record<string, unknown>>;
  return managers.map((row) => {
    const member = memberDirectory.byCrewMemberId.get(String(row.crew_member_id));
    return {
      id: String(row.id),
      userId: String(row.user_id),
      crewMemberId: String(row.crew_member_id),
      name: String(member?.stage_name || member?.name || "멤버"),
      profileImageUrl: member?.profile_image_url ?? null,
      isPrimary: row.is_primary === true,
      assignedAt: String(row.assigned_at),
    };
  });
}

async function loadProjectMeta(supabase: SupabaseClient, projectId: string) {
  const [{ data: project }, { data: firstDate }] = await Promise.all([
    supabase.from("projects").select("id,title").eq("id", projectId).maybeSingle(),
    supabase
      .from("schedule_dates")
      .select("date")
      .eq("project_id", projectId)
      .eq("kind", "event")
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    title: String((project as Record<string, unknown> | null)?.title ?? "프로젝트"),
    eventDate: dateValue((firstDate as Record<string, unknown> | null)?.date),
  };
}

async function loadAllowance(
  supabase: SupabaseClient,
  projectId: string,
  memberDirectory: Awaited<ReturnType<typeof loadFinanceMemberDirectory>>,
  mode: "display" | "confirmed" = "display"
): Promise<{
  batch: Record<string, unknown> | null;
  items: FinanceAllowanceItem[];
  payments: FinancePayment[];
}> {
  const { data: batches } = await supabase
    .from("finance_allowance_batches")
    .select("id,project_id,version,revision,status,confirmed_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(10);
  const allBatches = (batches ?? []) as Array<Record<string, unknown>>;
  const confirmedBatch = allBatches.find((row) => row.status === "confirmed") ?? null;
  const batch = mode === "confirmed"
    ? confirmedBatch
    : allBatches.find((row) => ["draft", "submitted", "rejected"].includes(String(row.status))) ??
      confirmedBatch;
  if (!batch) return { batch: null, items: [], payments: [] };

  const { data: itemRows } = await supabase
    .from("finance_allowance_items")
    .select("*")
    .eq("batch_id", String(batch.id))
    .order("created_at", { ascending: true });
  const rawItems = (itemRows ?? []) as Array<Record<string, unknown>>;

  const allBatchIds = allBatches.map((row) => String(row.id));
  let allProjectItemRows = rawItems;
  if (allBatchIds.length > 1) {
    const { data } = await supabase
      .from("finance_allowance_items")
      .select("id,recipient_user_id")
      .in("batch_id", allBatchIds);
    allProjectItemRows = (data ?? []) as Array<Record<string, unknown>>;
  }
  const itemIds = allProjectItemRows.map((row) => String(row.id));
  const allocationRows: Array<Record<string, unknown>> = [];
  if (itemIds.length) {
    const { data } = await supabase
      .from("finance_payment_allocations")
      .select("id,payment_id,allowance_item_id,amount")
      .in("allowance_item_id", itemIds);
    allocationRows.push(...((data ?? []) as Array<Record<string, unknown>>));
  }
  const paymentIds = Array.from(new Set(allocationRows.map((row) => String(row.payment_id))));
  const paymentRows: Array<Record<string, unknown>> = [];
  if (paymentIds.length) {
    const { data } = await supabase
      .from("finance_payments")
      .select("id,recipient_user_id,amount,currency,paid_at,status,source_system,source_transaction_id,evidence_id")
      .in("id", paymentIds);
    paymentRows.push(...((data ?? []) as Array<Record<string, unknown>>));
  }
  const paymentMap = new Map(paymentRows.map((row) => [String(row.id), row]));
  const paidByItem = new Map<string, number>();
  for (const allocation of allocationRows) {
    const payment = paymentMap.get(String(allocation.payment_id));
    if (payment?.status !== "executed") continue;
    const itemId = String(allocation.allowance_item_id);
    paidByItem.set(itemId, (paidByItem.get(itemId) ?? 0) + (money(allocation.amount) ?? 0));
  }

  const items = rawItems.map((row): FinanceAllowanceItem => {
    const recipient = memberDirectory.byUserId.get(String(row.recipient_user_id));
    const netAmount = money(row.net_amount);
    // The normal detail view returns the currently selected batch. When that batch
    // is confirmed, its executed payment allocations are part of the display too.
    // Working drafts/submissions deliberately remain at zero paid.
    const availablePaid = batch.status === "confirmed" ? paidByItem.get(String(row.id)) ?? 0 : 0;
    const paidAmount = netAmount === null ? 0 : Math.min(netAmount, availablePaid);
    return {
      id: String(row.id),
      recipientUserId: String(row.recipient_user_id),
      recipientCrewMemberId: (row.recipient_crew_member_id as string | null) ?? null,
      recipientName: String(recipient?.stage_name || recipient?.name || "멤버"),
      category: String(row.category),
      reason: String(row.reason),
      requestedAmountRaw: (row.requested_amount_raw as string | null) ?? null,
      grossAmount: money(row.gross_amount),
      taxType: row.tax_type as FinanceAllowanceItem["taxType"],
      taxableAmount: money(row.taxable_amount),
      incomeTaxAmount: money(row.income_tax_amount),
      localIncomeTaxAmount: money(row.local_income_tax_amount),
      deductionAmount: money(row.deduction_amount),
      netAmount,
      taxPolicyVersion: (row.tax_policy_version as string | null) ?? null,
      scheduledPaymentDate: dateValue(row.scheduled_payment_date),
      paidAmount,
      outstandingAmount: netAmount === null ? null : Math.max(0, netAmount - paidAmount),
      paymentStatus: netAmount === null ? "not_paid" : deriveFinancePaymentStatus(netAmount, paidAmount),
      evidencePresent: Boolean(row.evidence_id || row.evidence_reference),
      evidenceRef: (row.evidence_reference as string | null) ?? null,
    };
  });
  const payments = paymentRows.map((row): FinancePayment => ({
    id: String(row.id),
    recipientUserId: (row.recipient_user_id as string | null) ?? null,
    amount: money(row.amount) ?? 0,
    currency: String(row.currency),
    paidAt: dateValue(row.paid_at),
    status: row.status as FinancePayment["status"],
    sourceSystem: String(row.source_system),
    sourceTransactionId: String(row.source_transaction_id),
    evidencePresent: Boolean(row.evidence_id),
  }));
  return { batch, items, payments };
}

async function loadReceipts(supabase: SupabaseClient, projectId: string): Promise<FinanceReceipt[]> {
  const { data: allocations } = await supabase
    .from("finance_receipt_allocations")
    .select("receipt_id")
    .eq("project_id", projectId);
  const ids = Array.from(
    new Set(((allocations ?? []) as Array<{ receipt_id: string }>).map((row) => row.receipt_id))
  );
  if (!ids.length) return [];
  const { data: rows } = await supabase
    .from("finance_receipts")
    .select("id,amount,currency,received_at,counterparty,status,source_system,source_transaction_id,evidence_id")
    .in("id", ids);
  return ((rows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    amount: money(row.amount) ?? 0,
    currency: String(row.currency),
    receivedAt: dateValue(row.received_at),
    counterparty: (row.counterparty as string | null) ?? null,
    status: row.status as FinanceReceipt["status"],
    sourceSystem: String(row.source_system),
    sourceTransactionId: String(row.source_transaction_id),
    evidencePresent: Boolean(row.evidence_id),
  }));
}

export async function getFinanceProjectDetail(
  projectId: string,
  identity: FinanceIdentity,
  client: SupabaseClient = createRouteSupabaseClient()
): Promise<FinanceProjectDetail | null> {
  if (!identity.isGlobal && !identity.managedProjectIds.includes(projectId)) return null;
  const { data: financeRow, error } = await client
    .from("project_finance")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error || !financeRow) return null;
  const row = financeRow as Record<string, unknown>;
  const memberDirectory = await loadFinanceMemberDirectory(client, identity);
  const [meta, managers, allowance, confirmedAllowance, receipts, budgetEvidence] = await Promise.all([
    loadProjectMeta(client, projectId),
    loadManagers(client, projectId, memberDirectory),
    loadAllowance(client, projectId, memberDirectory),
    loadAllowance(client, projectId, memberDirectory, "confirmed"),
    loadReceipts(client, projectId),
    client
      .from("finance_evidence")
      .select("reference_value")
      .eq("project_id", projectId)
      .eq("kind", "budget")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const confirmedGrossAmount = confirmedAllowance.batch?.status === "confirmed"
    ? confirmedAllowance.items.reduce((sum, item) => sum + (item.grossAmount ?? 0), 0)
    : 0;
  const confirmedNetAmount = confirmedAllowance.batch?.status === "confirmed"
    ? confirmedAllowance.items.reduce((sum, item) => sum + (item.netAmount ?? 0), 0)
    : 0;
  const paymentExecutedAmount = confirmedAllowance.payments
    .filter((payment) => payment.status === "executed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const receiptExecutedAmount = receipts
    .filter((receipt) => receipt.status === "executed")
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const supply = money(row.contract_supply_amount);
  const vat = money(row.contract_vat_amount);
  const explicitTotal = money(row.contract_total_amount);
  const contractTotal = explicitTotal ?? (supply !== null && vat !== null ? supply + vat : null);
  const budgetAmount = money(row.budget_amount);
  const needsAttention =
    budgetAmount === null ||
    contractTotal === null ||
    managers.length === 0 ||
    allowance.items.some((item) => item.grossAmount === null || item.taxType === "undecided");

  return {
    projectId,
    title: meta.title,
    eventDate: meta.eventDate,
    clientName: (row.client_name as string | null) ?? null,
    currency: String(row.currency),
    budgetAmount,
    contractSupplyAmount: supply,
    contractVatAmount: vat,
    contractTotalAmount: contractTotal,
    contractAmountBasis: row.contract_amount_basis as FinanceProjectDetail["contractAmountBasis"],
    contractNote: (row.contract_note as string | null) ?? null,
    receiptExecutedAmount,
    receivableAmount: contractTotal === null ? null : Math.max(0, contractTotal - receiptExecutedAmount),
    confirmedGrossAmount,
    paymentExecutedAmount,
    unpaidAmount: Math.max(0, confirmedNetAmount - paymentExecutedAmount),
    allowanceStatus: (allowance.batch?.status as FinanceProjectDetail["allowanceStatus"]) ?? null,
    managers,
    version: Number(row.version),
    needsAttention,
    access: identity.isGlobal ? "global" : "project_manager",
    contractSourceSystem: (row.contract_source_system as string | null) ?? null,
    contractSourceId: (row.contract_source_id as string | null) ?? null,
    budgetSourceSystem: (row.budget_source_system as string | null) ?? null,
    budgetSourceId: (row.budget_source_id as string | null) ?? null,
    budgetEvidenceRef: (budgetEvidence.data as Record<string, unknown> | null)?.reference_value as string | null ?? null,
    allowanceBatchId: allowance.batch ? String(allowance.batch.id) : null,
    allowanceRevision: allowance.batch ? Number(allowance.batch.revision) : null,
    allowances: allowance.items,
    receipts,
    payments: confirmedAllowance.payments,
  };
}

export function toFinanceProjectSummary(detail: FinanceProjectDetail): FinanceProjectSummary {
  const { access: _access, contractSourceSystem: _a, contractSourceId: _b, budgetSourceSystem: _c,
    budgetSourceId: _d, budgetEvidenceRef: _e, allowanceBatchId: _f, allowanceRevision: _j,
    allowances: _g, receipts: _h, payments: _i, ...summary } = detail;
  return summary;
}

export async function getFinanceProjects(
  identity: FinanceIdentity,
  options: { cursor?: string | null; limit?: number } = {}
): Promise<{ data: FinanceProjectSummary[]; nextCursor: string | null }> {
  const supabase = createRouteSupabaseClient();
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  let query = supabase
    .from("project_finance")
    .select("project_id,projects!inner(pay_type)")
    .neq("projects.pay_type", "free")
    .is("archived_at", null)
    .order("project_id", { ascending: true })
    .limit(limit + 1);
  if (options.cursor) query = query.gt("project_id", options.cursor);
  const { data } = await query;
  const rows = (data ?? []) as Array<{ project_id: string }>;
  const page = rows.slice(0, limit);
  const details = await Promise.all(
    page.map((row) => getFinanceProjectDetail(row.project_id, identity, supabase))
  );
  return {
    data: details.filter((row): row is FinanceProjectDetail => row !== null).map(toFinanceProjectSummary),
    nextCursor: rows.length > limit ? page[page.length - 1]?.project_id ?? null : null,
  };
}

export async function getFinanceMySettlements(
  identity: FinanceIdentity,
  options: { projectId?: string | null } = {}
): Promise<FinanceMySettlementsResponse> {
  const supabase = createRouteSupabaseClient();
  const itemQuery = supabase
    .from("finance_allowance_items")
    .select("batch_id")
    .eq("recipient_user_id", identity.userId);
  const { data: itemRefs } = await itemQuery;
  const batchIds = Array.from(new Set(((itemRefs ?? []) as Array<{ batch_id: string }>).map((r) => r.batch_id)));
  const { data: pendingCountBeforeConfirmed } = await supabase.rpc(
    "finance_get_my_pending_confirmation_count",
    { p_actor_user_id: identity.userId }
  );
  if (!batchIds.length) {
    return {
      data: [],
      totals: {
        pendingConfirmationCount: Number(pendingCountBeforeConfirmed ?? 0),
        totalsByCurrency: {},
      },
      nextCursor: null,
    };
  }
  const memberDirectory = await loadFinanceMemberDirectory(supabase, identity);
  let batchQuery = supabase
    .from("finance_allowance_batches")
    .select("id,project_id,confirmed_at,status")
    .in("id", batchIds)
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: false });
  if (options.projectId) batchQuery = batchQuery.eq("project_id", options.projectId);
  const { data: batchRows } = await batchQuery;
  const [{ data: myPaymentRows }] = await Promise.all([
    supabase.rpc("finance_get_my_payment_allocations", { p_actor_user_id: identity.userId }),
  ]);
  const paidByItem = new Map<string, number>();
  for (const row of (myPaymentRows ?? []) as Array<Record<string, unknown>>) {
    if (row.status !== "executed") continue;
    const itemId = String(row.allowance_item_id);
    paidByItem.set(itemId, (paidByItem.get(itemId) ?? 0) + (money(row.amount) ?? 0));
  }
  const settlements: FinanceMySettlement[] = [];
  for (const batch of (batchRows ?? []) as Array<Record<string, unknown>>) {
    const projectId = String(batch.project_id);
    const allowance = await loadAllowance(supabase, projectId, memberDirectory, "confirmed");
    const mine = allowance.items
      .filter((item) => item.recipientUserId === identity.userId)
      .map((item) => {
        const paidAmount = paidByItem.get(item.id) ?? 0;
        return {
          ...item,
          paidAmount,
          outstandingAmount: item.netAmount === null ? null : Math.max(0, item.netAmount - paidAmount),
          paymentStatus: item.netAmount === null
            ? "not_paid" as const
            : deriveFinancePaymentStatus(item.netAmount, paidAmount),
          evidenceRef: undefined,
        };
      });
    const meta = await loadProjectMeta(supabase, projectId);
    const { data: projectCurrency } = await supabase.rpc("finance_get_my_project_currency", {
      p_actor_user_id: identity.userId,
      p_project_id: projectId,
    });
    settlements.push({
      projectId,
      projectTitle: meta.title,
      eventDate: meta.eventDate,
      allowanceBatchId: String(batch.id),
      confirmedAt: String(batch.confirmed_at),
      currency: String(projectCurrency ?? "KRW"),
      items: mine,
    });
  }
  const totalsByCurrency: FinanceMySettlementsResponse["totals"]["totalsByCurrency"] = {};
  for (const settlement of settlements) {
    const totals = totalsByCurrency[settlement.currency] ?? {
      confirmedUnpaidAmount: 0,
      receivedAmount: 0,
    };
    for (const item of settlement.items) {
      totals.confirmedUnpaidAmount += item.outstandingAmount ?? 0;
      totals.receivedAmount += item.paidAmount;
    }
    totalsByCurrency[settlement.currency] = totals;
  }
  return {
    data: settlements,
    totals: {
      pendingConfirmationCount: Number(pendingCountBeforeConfirmed ?? 0),
      totalsByCurrency,
    },
    nextCursor: null,
  };
}
