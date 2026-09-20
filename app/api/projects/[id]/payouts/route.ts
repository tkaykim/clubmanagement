import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/payouts — 폐기된 레거시 정산 생성 경로.
 *
 * projects.fee는 공개 모집 조건이지 프로젝트 예산 또는 개인별 확정 수당이 아니다.
 * 승인자 전원에게 같은 금액을 복사하던 동작은 finance 원장과 충돌하므로 영구 차단한다.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;

    // UUID 검증 — SQL Injection 방지
    const uuidResult = z.string().uuid().safeParse(projectId);
    if (!uuidResult.success) {
      return NextResponse.json(
        { error: "잘못된 프로젝트 ID입니다" },
        { status: 400 }
      );
    }

    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;

    return NextResponse.json(
      {
        error: "이 정산 생성 경로는 종료되었습니다. 재무 화면에서 개인별 수당을 등록해주세요.",
        code: "LEGACY_PAYOUT_CREATION_DISABLED",
      },
      { status: 410 }
    );
  } catch (err) {
    console.error("[POST /api/projects/[id]/payouts] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
