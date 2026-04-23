import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioCareerInputSchema } from "@/lib/validators";

/**
 * GET /api/portfolio/careers — 경력 목록 조회 (public)
 * Query: category?
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const supabase = createRouteSupabaseClient();
    let query = supabase
      .from("portfolio_careers")
      .select(`
        *,
        media:portfolio_media(id, title, thumbnail_url, youtube_url)
      `)
      .order("event_date", { ascending: false, nullsFirst: false });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "경력 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/portfolio/careers] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * POST /api/portfolio/careers — 경력 생성 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = portfolioCareerInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    const { data, error } = await supabase
      .from("portfolio_careers")
      .insert({
        ...parsed.data,
        created_by: admin.user_id ?? null,
      })
      .select(`
        *,
        media:portfolio_media(id, title, thumbnail_url, youtube_url)
      `)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "경력 생성에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/portfolio/careers] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
