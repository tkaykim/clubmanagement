import { isNextResponse } from "@/lib/auth";
import { financeJson, getFinanceMySettlements, requireFinanceIdentity } from "@/lib/finance-server";

export async function GET(request: Request) {
  const identity = await requireFinanceIdentity({ allowMember: true });
  if (isNextResponse(identity)) return identity;
  const params = new URL(request.url).searchParams;
  const result = await getFinanceMySettlements(identity, { projectId: params.get("projectId") });
  const year = params.get("year");
  const month = params.get("month");
  if (year || month) {
    result.data = result.data.filter((row) => {
      if (!row.eventDate) return false;
      if (year && !row.eventDate.startsWith(year)) return false;
      if (month && row.eventDate.slice(5, 7) !== month.padStart(2, "0")) return false;
      return true;
    });
  }
  const totalsByCurrency: typeof result.totals.totalsByCurrency = {};
  for (const settlement of result.data) {
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
  result.totals.totalsByCurrency = totalsByCurrency;
  return financeJson(result);
}
