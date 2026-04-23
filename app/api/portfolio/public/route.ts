import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import type { PortfolioSectionKey } from "@/lib/types";

/**
 * GET /api/portfolio/public — 섹션+미디어+경력+공개 멤버 일괄 반환 (public)
 * SSR Server Component에서는 직접 쿼리 권장. 클라이언트 컴포넌트 전용.
 */
export async function GET() {
  try {
    const supabase = createRouteSupabaseClient();

    const [sectionsRes, mediaRes, careersRes, membersRes] = await Promise.all([
      supabase.from("portfolio_sections").select("*"),
      supabase
        .from("portfolio_media")
        .select(`
          *,
          members:portfolio_media_members(
            sort_order,
            crew_member:crew_members(id, stage_name, name, profile_image_url, is_public, is_active)
          )
        `)
        .order("sort_order", { ascending: true }),
      supabase
        .from("portfolio_careers")
        .select(`
          *,
          media:portfolio_media(id, title, thumbnail_url, youtube_url)
        `)
        .order("event_date", { ascending: false, nullsFirst: false }),
      supabase
        .from("public_crew_members_view")
        .select("*")
        .order("joined_month", { ascending: true, nullsFirst: false }),
    ]);

    // 섹션 key→value 맵
    const sectionsMap = (sectionsRes.data ?? []).reduce<Record<string, string>>(
      (acc, row) => {
        acc[row.key as PortfolioSectionKey] = row.value;
        return acc;
      },
      {}
    );

    const media = (mediaRes.data ?? []).map((item) => ({
      ...item,
      members: (item.members ?? [])
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
        .map((m: { crew_member: unknown }) => m.crew_member)
        .filter(Boolean),
    }));

    return NextResponse.json({
      data: {
        sections: sectionsMap,
        media,
        careers: careersRes.data ?? [],
        members: membersRes.data ?? [],
      },
    });
  } catch (err) {
    console.error("[GET /api/portfolio/public] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
