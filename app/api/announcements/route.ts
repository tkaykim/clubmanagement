import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { createAnnouncementSchema } from "@/lib/validators";

/**
 * POST /api/announcements — 공지 작성 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert({
        ...parsed.data,
        author_id: admin.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "공지 작성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/announcements] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
