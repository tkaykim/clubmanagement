import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { getSettlementsMonthly } from "@/lib/queries/settlements";

/**
 * GET /api/settlements?month=YYYY-MM — 월별 정산 요약 (admin)
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
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/settlements] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
