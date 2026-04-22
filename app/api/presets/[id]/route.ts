import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";
import { presetSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/presets/[id] — 프리셋 수정 (본인 only)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const body = await request.json();
    const parsed = presetSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // RLS가 user_id 체크를 하지만 명시적 확인
    const { data: existing } = await supabase
      .from("availability_presets")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "프리셋을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: "본인의 프리셋만 수정할 수 있습니다" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("availability_presets")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "프리셋 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/presets/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presets/[id] — 프리셋 삭제 (본인 only)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const supabase = createRouteSupabaseClient();

    const { data: existing } = await supabase
      .from("availability_presets")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "프리셋을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: "본인의 프리셋만 삭제할 수 있습니다" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("availability_presets")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "프리셋 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/presets/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
