import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { getSession, requireAdmin, isNextResponse } from "@/lib/auth";
import { memberPublicProfileSchema } from "@/lib/validators";
import { validateUuidParam } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/members/[id]/public — 공개 프로필 수정 (owner/admin 또는 본인)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const uuidError = validateUuidParam(id);
    if (uuidError) return uuidError;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const supabase = createRouteSupabaseClient();

    // 대상 멤버 조회
    const { data: target } = await supabase
      .from("crew_members")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "멤버를 찾을 수 없습니다" }, { status: 404 });
    }

    // 권한 확인: 본인이거나 admin/owner 이어야 함
    const isSelf = target.user_id === session.userId;
    if (!isSelf) {
      const adminOrResponse = await requireAdmin();
      if (isNextResponse(adminOrResponse)) {
        return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = memberPublicProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("crew_members")
      .update(parsed.data)
      .eq("id", id)
      .select(
        "id, stage_name, name, position, profile_image_url, public_bio, specialties, is_public, is_active, joined_month"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: "프로필 수정에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/members/[id]/public] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
