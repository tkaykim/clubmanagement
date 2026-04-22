import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireOwner, isNextResponse } from "@/lib/auth";
import { memberRoleSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/members/[id]/role — 멤버 역할 변경 (owner 전용)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const ownerOrResponse = await requireOwner();
    if (isNextResponse(ownerOrResponse)) return ownerOrResponse;

    const body = await request.json();
    const parsed = memberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // crew_members 역할 업데이트
    const { data: cm, error: cmError } = await supabase
      .from("crew_members")
      .update({ role: parsed.data.role })
      .eq("id", id)
      .select("id, user_id, role")
      .single();

    if (cmError || !cm) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // users 테이블도 동기화
    if (cm.user_id) {
      await supabase
        .from("users")
        .update({ role: parsed.data.role })
        .eq("id", cm.user_id);
    }

    return NextResponse.json({ data: { role: cm.role } });
  } catch (err) {
    console.error("[PATCH /api/members/[id]/role] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
