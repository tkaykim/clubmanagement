import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { updatePayoutSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/payouts/[id] — 정산 상태 변경 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = updatePayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // 상태 전이 유효성 검사
    const { data: existing } = await supabase
      .from("payouts")
      .select("id, status")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "정산 내역을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 상태 전이 규칙: pending → scheduled → paid (역방향 불가)
    const statusOrder = { pending: 0, scheduled: 1, paid: 2 };
    if (
      parsed.data.status &&
      statusOrder[parsed.data.status as keyof typeof statusOrder] <
        statusOrder[existing.status as keyof typeof statusOrder]
    ) {
      return NextResponse.json(
        { error: "정산 상태를 이전 단계로 되돌릴 수 없습니다" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payouts")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "정산 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/payouts/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
