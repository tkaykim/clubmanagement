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

    // scope / project_id 정합성
    const payload = {
      ...parsed.data,
      project_id: parsed.data.scope === "project" ? parsed.data.project_id ?? null : null,
    };
    if (payload.scope === "project" && !payload.project_id) {
      return NextResponse.json(
        { error: "프로젝트를 선택해주세요" },
        { status: 400 }
      );
    }

    if (!admin.user_id) {
      // crew_members.user_id 가 비어 있는 레거시 레코드 방어
      return NextResponse.json(
        { error: "작성자 계정 정보를 찾을 수 없습니다" },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert({
        ...payload,
        author_id: admin.user_id,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/announcements]", error);
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
