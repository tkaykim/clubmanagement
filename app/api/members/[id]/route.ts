import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, requireOwner, isNextResponse } from "@/lib/auth";
import { updateMemberSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

const memberActionSchema = z.object({
  action: z.enum(["approve", "deactivate", "activate"]).optional(),
});

/**
 * PATCH /api/members/[id] — 멤버 정보 수정 또는 상태 변경 (admin)
 * body: { action: 'approve' | 'deactivate' | 'activate' } 또는 updateMemberSchema 필드
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();

    // action 기반 상태 변경 처리
    const actionParsed = memberActionSchema.safeParse(body);
    if (actionParsed.success && actionParsed.data.action) {
      const action = actionParsed.data.action;
      const updateValue =
        action === "approve" || action === "activate"
          ? { is_active: true }
          : { is_active: false };

      const supabase = createRouteSupabaseClient();
      const { data, error } = await supabase
        .from("crew_members")
        .update(updateValue)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(
            { error: "멤버를 찾을 수 없습니다" },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { error: "멤버 상태 변경에 실패했습니다" },
          { status: 500 }
        );
      }
      return NextResponse.json({ data });
    }

    // 일반 필드 업데이트 처리
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("crew_members")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "멤버를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "멤버 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/members/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/members/[id] — 멤버 영구 삭제 (owner 전용)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const ownerOrResponse = await requireOwner();
    if (isNextResponse(ownerOrResponse)) return ownerOrResponse;

    const supabase = createRouteSupabaseClient();
    const { error } = await supabase
      .from("crew_members")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/members/[id]] error:", error);
      return NextResponse.json(
        { error: "멤버 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/members/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
