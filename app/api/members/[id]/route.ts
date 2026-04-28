import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, requireOwner, isNextResponse } from "@/lib/auth";
import { updateMemberSchema } from "@/lib/validators";
import { notifyUsers } from "@/lib/notifications";

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

      // P0 #2: 가입 승인 시 본인 알림
      const member = data as { user_id: string | null };
      if ((action === "approve" || action === "activate") && member.user_id) {
        await notifyUsers([member.user_id], {
          title: "가입이 승인되었어요",
          body: "원샷크루에 오신 것을 환영합니다 🎉",
          url: "/dashboard",
          tag: `member-approved-${id}`,
        });
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

    // 변경 전 contract_type 스냅샷
    const { data: before } = await supabase
      .from("crew_members")
      .select("contract_type, user_id")
      .eq("id", id)
      .maybeSingle();

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

    // P1 #13: 계약유형 변경 시 본인 알림
    const memberRow = data as { user_id: string | null; contract_type: string };
    const beforeRow = before as { contract_type: string; user_id: string | null } | null;
    if (
      memberRow.user_id &&
      parsed.data.contract_type &&
      beforeRow?.contract_type !== memberRow.contract_type
    ) {
      const labels: Record<string, string> = {
        contract: "계약멤버",
        non_contract: "일반멤버",
        guest: "게스트",
      };
      await notifyUsers([memberRow.user_id], {
        title: "멤버 구분이 변경되었어요",
        body: `${labels[memberRow.contract_type] ?? memberRow.contract_type} 로 변경되었습니다`,
        url: "/mypage",
        tag: `member-contract-${id}`,
      });
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
