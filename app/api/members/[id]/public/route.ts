import { NextResponse } from "next/server";
import { createRouteSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
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

    // "" → null 정규화 (URL 등 nullable 컬럼 대비)
    const normalized: Record<string, unknown> = { ...parsed.data };
    for (const k of [
      "youtube_url",
      "instagram_handle",
      "phone",
      "stage_name",
      "top_size",
      "bottom_size",
      "shoe_size",
      "wardrobe_notes",
      "birth_date",
      "profile_image_url",
      "public_bio",
      "bank_code",
      "bank_name",
      "bank_account",
      "bank_holder",
      "gender",
    ]) {
      if (normalized[k] === "") normalized[k] = null;
    }

    const payoutKeys = ["bank_code", "bank_name", "bank_account", "bank_holder"] as const;
    const payoutData = Object.fromEntries(
      payoutKeys
        .filter((key) => key in parsed.data)
        .map((key) => [key, normalized[key] ?? null])
    );
    const hasPayoutUpdate = payoutKeys.some((key) => key in parsed.data);
    for (const key of payoutKeys) delete normalized[key];

    const writeSupabase = createServiceSupabaseClient();
    if (!writeSupabase) {
      return NextResponse.json(
        { error: "프로필 저장 서비스를 사용할 수 없습니다" },
        { status: 503 }
      );
    }

    const { data: updatedMemberId, error: updateError } = await writeSupabase.rpc(
      "service_update_member_profile_and_payout_v2",
      {
        p_member_id: id,
        p_profile_updates: normalized,
        p_payout_updates: hasPayoutUpdate ? payoutData : null,
      }
    );
    if (updateError || !updatedMemberId) {
      console.error("[PATCH /api/members/[id]/public] atomic update error:", updateError);
      return NextResponse.json({ error: "프로필 수정에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { id: updatedMemberId } });
  } catch (err) {
    console.error("[PATCH /api/members/[id]/public] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
