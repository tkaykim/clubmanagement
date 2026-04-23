import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioSectionUpdateSchema } from "@/lib/validators";

const sectionsBodySchema = z.object({
  sections: z.array(portfolioSectionUpdateSchema).min(1),
});

/**
 * GET /api/portfolio/sections — 섹션 목록 조회 (public)
 */
export async function GET() {
  try {
    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("portfolio_sections")
      .select("*")
      .order("key");

    if (error) {
      return NextResponse.json({ error: "섹션 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/portfolio/sections] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * PATCH /api/portfolio/sections — 섹션 일괄 upsert (admin)
 */
export async function PATCH(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = sectionsBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const rows = parsed.data.sections.map((s) => ({
      key: s.key,
      value: s.value,
      updated_by: admin.user_id ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("portfolio_sections")
      .upsert(rows, { onConflict: "key" })
      .select();

    if (error) {
      return NextResponse.json({ error: "섹션 저장에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[PATCH /api/portfolio/sections] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
