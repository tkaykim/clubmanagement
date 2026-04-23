import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

const reorderBodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
      })
    )
    .min(1),
});

/**
 * POST /api/portfolio/media/reorder — sort_order 일괄 변경 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = reorderBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    let updated = 0;

    for (const item of parsed.data.items) {
      const { error } = await supabase
        .from("portfolio_media")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);
      if (!error) updated++;
    }

    return NextResponse.json({ data: { updated } });
  } catch (err) {
    console.error("[POST /api/portfolio/media/reorder] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
