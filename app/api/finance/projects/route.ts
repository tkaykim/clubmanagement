import { isNextResponse } from "@/lib/auth";
import { canEnterFinance } from "@/lib/finance-access";
import { financeApiError, financeJson, getFinanceProjects, requireFinanceIdentity } from "@/lib/finance-server";

export async function GET(request: Request) {
  const identity = await requireFinanceIdentity();
  if (isNextResponse(identity)) return identity;
  if (!canEnterFinance(identity)) {
    return financeApiError(403, "FORBIDDEN", "재무 프로젝트 권한이 없습니다");
  }
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit") ?? 50);
  const result = await getFinanceProjects(identity, {
    cursor: params.get("cursor"),
    limit: Number.isFinite(limit) ? limit : 50,
  });
  let data = result.data;
  const month = params.get("month");
  if (month) data = data.filter((row) => row.eventDate?.startsWith(month));
  const managerUserId = params.get("managerUserId");
  if (managerUserId) data = data.filter((row) => row.managers.some((m) => m.userId === managerUserId));
  const receiptStatus = params.get("receiptStatus");
  if (receiptStatus === "unpaid") data = data.filter((row) => (row.receivableAmount ?? 0) > 0);
  if (receiptStatus === "paid") data = data.filter((row) => row.receivableAmount === 0);
  const paymentStatus = params.get("paymentStatus");
  if (paymentStatus === "unpaid") data = data.filter((row) => row.unpaidAmount > 0);
  if (paymentStatus === "paid") data = data.filter((row) => row.unpaidAmount === 0 && row.confirmedGrossAmount > 0);
  return financeJson({
    data,
    access: identity.isGlobal ? "global" : "project_manager",
    nextCursor: result.nextCursor,
  });
}
