import { isNextResponse } from "@/lib/auth";
import { financeApiError, getFinanceProjectDetail, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };
const cell = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ projectId: id });
  if (isNextResponse(identity)) return identity;
  const detail = await getFinanceProjectDetail(id, identity);
  if (!detail) return financeApiError(404, "NOT_FOUND", "프로젝트 재무를 찾을 수 없습니다");
  const header = [
    "프로젝트", "수취인", "사유", "세전", "소득세", "지방소득세", "공제합계",
    "실지급예정", "실지급누계", "미지급", "통화", "지급예정일", "증빙참조",
  ];
  const rows = detail.allowances.map((item) => [
    detail.title, item.recipientName, `${item.category}: ${item.reason}`, item.grossAmount,
    item.incomeTaxAmount, item.localIncomeTaxAmount, item.deductionAmount, item.netAmount,
    item.paidAmount, item.outstandingAmount, detail.currency, item.scheduledPaymentDate,
    item.evidenceRef ?? "",
  ]);
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-${id}.csv"`,
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
    },
  });
}
