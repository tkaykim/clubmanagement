import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { updateAnnouncementSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/announcements/[id] — 공지 수정 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = updateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("announcements")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "공지를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "공지 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/announcements/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/announcements/[id] — 공지 삭제 (admin)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const supabase = createRouteSupabaseClient();
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "공지 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/announcements/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
