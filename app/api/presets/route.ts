import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";
import { presetSchema } from "@/lib/validators";

/**
 * POST /api/presets — 가용성 프리셋 생성 (인증 필요)
 */
export async function POST(request: Request) {
  try {
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const body = await request.json();
    const parsed = presetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("availability_presets")
      .insert({
        ...parsed.data,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "프리셋 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/presets] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
