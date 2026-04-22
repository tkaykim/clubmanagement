import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { getSettlementsMonthly } from "@/lib/queries/settlements";
import type { SettlementMember } from "@/lib/types";

/**
 * GET /api/settlements/csv?month=YYYY-MM — 정산 CSV 다운로드 (admin)
 */
export async function GET(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다 (YYYY-MM 형식)" },
        { status: 400 }
      );
    }

    const data = await getSettlementsMonthly(month);

    const header = "이름,예명,프로젝트수,총금액,지급완료,예정,대기\n";
    const rows = data
      .map((m: SettlementMember) =>
        [
          m.name,
          m.stage_name ?? "",
          m.project_count,
          m.total_amount,
          m.paid_amount,
          m.scheduled_amount,
          m.pending_amount,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const csv = "\uFEFF" + header + rows; // BOM for Excel

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="settlement-${month}.csv"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/settlements/csv] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
