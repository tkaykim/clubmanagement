import { isNextResponse } from "@/lib/auth";
import { filterFinanceSettlementsByEventDate } from "@/lib/finance-settlement-date-filter";
import { getFinanceMySettlements, requireFinanceIdentity } from "@/lib/finance-server";

const cell = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const identity = await requireFinanceIdentity({ allowMember: true });
  if (isNextResponse(identity)) return identity;
  const params = new URL(request.url).searchParams;
  const result = await getFinanceMySettlements(identity, { projectId: params.get("projectId") });
  const settlements = filterFinanceSettlementsByEventDate(result.data, {
    year: params.get("year"),
    month: params.get("month"),
  });
  const header = [
    "프로젝트", "행사일", "사유", "세전", "소득세", "지방소득세", "공제합계",
    "실지급예정", "실지급누계", "미지급", "통화", "지급예정일",
  ];
  const rows = settlements.flatMap((settlement) => settlement.items.map((item) => [
    settlement.projectTitle, settlement.eventDate, `${item.category}: ${item.reason}`,
    item.grossAmount, item.incomeTaxAmount, item.localIncomeTaxAmount, item.deductionAmount,
    item.netAmount, item.paidAmount, item.outstandingAmount, settlement.currency,
    item.scheduledPaymentDate,
  ]));
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-settlements.csv"',
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
    },
  });
}
