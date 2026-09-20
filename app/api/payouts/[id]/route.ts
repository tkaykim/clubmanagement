import { NextResponse } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/payouts/[id] — 폐기된 레거시 정산 상태 변경 경로.
 *
 * 실제 지급 상태는 증빙과 배부를 가진 finance 원장에서만 변경한다.
 * 과거 payouts 행은 읽기 이력으로만 남긴다.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    await params;
    await request.text().catch(() => "");
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;

    return NextResponse.json(
      {
        error: "과거 정산은 읽기 전용입니다. 지급 결과는 재무 원장에서 등록해주세요.",
        code: "LEGACY_PAYOUT_MUTATION_DISABLED",
      },
      { status: 410 }
    );
  } catch (err) {
    console.error("[PATCH /api/payouts/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
