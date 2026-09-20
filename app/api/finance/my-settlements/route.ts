import { isNextResponse } from "@/lib/auth";
import { filterFinanceSettlementsByEventDate } from "@/lib/finance-settlement-date-filter";
import { financeJson, getFinanceMySettlements, requireFinanceIdentity } from "@/lib/finance-server";

export async function GET(request: Request) {
  const identity = await requireFinanceIdentity({ allowMember: true });
  if (isNextResponse(identity)) return identity;
  const params = new URL(request.url).searchParams;
  const result = await getFinanceMySettlements(identity, { projectId: params.get("projectId") });
  const year = params.get("year");
  const month = params.get("month");
  result.data = filterFinanceSettlementsByEventDate(result.data, { year, month });
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
