import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type Body = {
  // 기존 멤버로 추가하려면 crew_member_id 또는 user_id 하나를 전달.
  crew_member_id?: string | null;
  user_id?: string | null;
  // 비회원(게스트) 로 추가하려면 guest_name 필수.
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  status?: "pending" | "approved" | "rejected";
  memo?: string | null;
};

// POST /api/manage/projects/[id]/participants
// admin/owner 가 임의로 프로젝트 참여자를 추가한다.
// - 플랫폼 멤버: crew_member_id(권장) 또는 user_id 전달
// - 비회원: guest_name 만 있으면 됨 (email/phone 은 옵션)
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const auth = await requireAdmin();
    if (isNextResponse(auth)) return auth;

    const body = (await request.json()) as Body;
    const supabase = createRouteSupabaseClient();

    let resolvedUserId: string | null = body.user_id ?? null;

    if (!resolvedUserId && body.crew_member_id) {
      const { data: cm } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("id", body.crew_member_id)
        .maybeSingle();
      resolvedUserId = (cm?.user_id as string | null | undefined) ?? null;
    }

    const isGuest = !resolvedUserId;
    if (isGuest && !body.guest_name?.trim()) {
      return NextResponse.json(
        { error: "멤버를 지정하거나 게스트 이름을 입력해주세요" },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    // 멤버 중복 방지 (게스트는 중복 허용)
    if (resolvedUserId) {
      const { data: existing } = await supabase
        .from("project_applications")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", resolvedUserId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: "이미 해당 멤버가 이 프로젝트에 참여 중입니다" },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("project_applications")
      .insert({
        project_id: projectId,
        user_id: resolvedUserId,
        guest_name: isGuest ? body.guest_name?.trim() : null,
        guest_email: isGuest ? body.guest_email?.trim() || null : null,
        guest_phone: isGuest ? body.guest_phone?.trim() || null : null,
        status: body.status ?? "approved",
        answers: {},
        fee_agreement: "negotiable",
        memo: body.memo ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user_id,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/manage/projects/[id]/participants]", error);
      return NextResponse.json({ error: "참여자 추가에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/manage/projects/[id]/participants] ex:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
