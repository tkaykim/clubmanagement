import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { createMemberSchema } from "@/lib/validators";

/**
 * POST /api/members — 멤버 생성 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("crew_members")
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "멤버 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/members] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
