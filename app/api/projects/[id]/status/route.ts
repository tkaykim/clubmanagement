import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { projectStatusSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/projects/[id]/status — 프로젝트 상태 변경 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = projectStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("projects")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "프로젝트를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "상태 변경에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/status] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
