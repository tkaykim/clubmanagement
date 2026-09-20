import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/auth";
import { requireFinanceIdentity } from "@/lib/finance-server";
import { getSettlementsMonthly } from "@/lib/queries/settlements";

/**
 * GET /api/settlements?month=YYYY-MM — 권한 범위 내 과거 정산 요약.
 */
export async function GET(request: Request) {
  try {
    const accessOrResponse = await requireFinanceIdentity();
    if (isNextResponse(accessOrResponse)) return accessOrResponse;
    if (!accessOrResponse.isGlobal && accessOrResponse.managedProjectIds.length === 0) {
      return NextResponse.json(
        { error: "재무 조회 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다 (YYYY-MM 형식)" },
        { status: 400 }
      );
    }

    const data = await getSettlementsMonthly(
      month,
      { projectIds: accessOrResponse.isGlobal ? null : accessOrResponse.managedProjectIds }
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("[GET /api/settlements] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
