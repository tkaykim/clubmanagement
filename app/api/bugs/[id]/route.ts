import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { updateBugReportSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/bugs/[id] — 상태/관리자 메모 수정 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = updateBugReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const patch: Record<string, unknown> = { ...parsed.data };

    // resolved 상태로 전환 시 자동으로 resolved_at / resolved_by 기록
    // NOTE: resolved_by 는 users(id) FK → admin.user_id 사용
    if (parsed.data.status !== undefined) {
      if (parsed.data.status === "resolved") {
        patch.resolved_at = new Date().toISOString();
        patch.resolved_by = admin.user_id;
      } else {
        patch.resolved_at = null;
        patch.resolved_by = null;
      }
    }

    const { data, error } = await supabase
      .from("bug_reports")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "리포트를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("[PATCH /api/bugs/[id]] update error:", error);
      return NextResponse.json(
        { error: "수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/bugs/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bugs/[id] — 버그 리포트 삭제 (admin)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const supabase = createRouteSupabaseClient();
    const { error } = await supabase.from("bug_reports").delete().eq("id", id);
    if (error) {
      console.error("[DELETE /api/bugs/[id]] error:", error);
      return NextResponse.json(
        { error: "삭제에 실패했습니다" },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/bugs/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
