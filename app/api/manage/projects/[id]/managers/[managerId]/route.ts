import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string; managerId: string }> };

// DELETE /api/manage/projects/[id]/managers/[managerId]
// 프로젝트 관리자 지정 해제 (운영진 전용). managerId = project_managers.id
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id: projectId, managerId } = await params;
    const auth = await requireAdmin();
    if (isNextResponse(auth)) return auth;

    const supabase = createRouteSupabaseClient();
    const { error } = await supabase
      .from("project_managers")
      .delete()
      .eq("id", managerId)
      .eq("project_id", projectId);

    if (error) {
      console.error("[DELETE managers]", error);
      return NextResponse.json({ error: "해제에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE managers] ex:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
