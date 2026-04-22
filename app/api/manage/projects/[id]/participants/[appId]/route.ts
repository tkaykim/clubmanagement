import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string; appId: string }> };

type PatchBody = {
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  status?: "pending" | "approved" | "rejected";
  memo?: string | null;
};

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);

// PATCH /api/manage/projects/[id]/participants/[appId]
// admin 이 참여자의 게스트 필드 / 상태 / 메모를 수정한다.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: projectId, appId } = await params;
    const auth = await requireAdmin();
    if (isNextResponse(auth)) return auth;

    const body = (await request.json()) as PatchBody;

    const update: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "잘못된 상태값입니다" }, { status: 400 });
      }
      update.status = body.status;
      update.reviewed_at = new Date().toISOString();
      update.reviewed_by = auth.user_id;
    }
    // 게스트 필드 — 멤버 지원자에게도 덮어쓸 수 있도록 허용 (관리자 임의 편집).
    if (body.guest_name !== undefined) update.guest_name = body.guest_name;
    if (body.guest_email !== undefined) update.guest_email = body.guest_email;
    if (body.guest_phone !== undefined) update.guest_phone = body.guest_phone;
    if (body.memo !== undefined) update.memo = body.memo;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("project_applications")
      .update(update)
      .eq("id", appId)
      .eq("project_id", projectId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[PATCH participant]", error);
      return NextResponse.json({ error: "수정에 실패했습니다" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "참여자를 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH participant] ex:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

// DELETE /api/manage/projects/[id]/participants/[appId]
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id: projectId, appId } = await params;
    const auth = await requireAdmin();
    if (isNextResponse(auth)) return auth;

    const supabase = createRouteSupabaseClient();
    const { error } = await supabase
      .from("project_applications")
      .delete()
      .eq("id", appId)
      .eq("project_id", projectId);

    if (error) {
      console.error("[DELETE participant]", error);
      return NextResponse.json({ error: "삭제에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE participant] ex:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
