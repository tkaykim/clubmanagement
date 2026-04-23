import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioCareerInputSchema } from "@/lib/validators";
import { validateUuidParam } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/portfolio/careers/[id] — 경력 수정 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const uuidError = validateUuidParam(id);
    if (uuidError) return uuidError;

    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = portfolioCareerInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    const { data: existing } = await supabase
      .from("portfolio_careers")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "경력을 찾을 수 없습니다" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("portfolio_careers")
      .update(parsed.data)
      .eq("id", id)
      .select(`
        *,
        media:portfolio_media(id, title, thumbnail_url, youtube_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: "경력 수정에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/portfolio/careers/[id]] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * DELETE /api/portfolio/careers/[id] — 경력 삭제 (admin)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const uuidError = validateUuidParam(id);
    if (uuidError) return uuidError;

    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const supabase = createRouteSupabaseClient();

    const { data: existing } = await supabase
      .from("portfolio_careers")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "경력을 찾을 수 없습니다" }, { status: 404 });
    }

    const { error } = await supabase.from("portfolio_careers").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "경력 삭제에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    console.error("[DELETE /api/portfolio/careers/[id]] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
