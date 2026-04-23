import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioMediaInputSchema } from "@/lib/validators";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";

/**
 * GET /api/portfolio/media — 미디어 목록 조회 (public)
 * Query: kind?, featured?
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const featured = searchParams.get("featured");

    const supabase = createRouteSupabaseClient();
    let query = supabase
      .from("portfolio_media")
      .select(`
        *,
        members:portfolio_media_members(
          sort_order,
          crew_member:crew_members(id, stage_name, name, profile_image_url, is_public, is_active)
        )
      `)
      .order("sort_order", { ascending: true });

    if (kind) query = query.eq("kind", kind);
    if (featured === "true") query = query.eq("is_featured", true);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "미디어 조회에 실패했습니다" }, { status: 500 });
    }

    const normalized = (data ?? []).map((item) => ({
      ...item,
      members: (item.members ?? [])
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
        .map((m: { crew_member: unknown }) => m.crew_member)
        .filter(Boolean),
    }));

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error("[GET /api/portfolio/media] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * POST /api/portfolio/media — 미디어 생성 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = portfolioMediaInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { member_ids, youtube_url, thumbnail_url, ...mediaData } = parsed.data;

    // YouTube URL 검증
    let resolvedYoutubeUrl: string | null = youtube_url ?? null;
    let resolvedThumbnailUrl: string | null = thumbnail_url ?? null;

    if (youtube_url) {
      const videoId = extractYouTubeId(youtube_url);
      if (!videoId) {
        return NextResponse.json(
          { error: "유효하지 않은 YouTube URL입니다" },
          { status: 400 }
        );
      }
      resolvedYoutubeUrl = youtube_url;
      if (!thumbnail_url) {
        resolvedThumbnailUrl = youtubeThumbnail(videoId, "hq");
      }
    }

    const supabase = createRouteSupabaseClient();

    const { data: media, error: mediaError } = await supabase
      .from("portfolio_media")
      .insert({
        ...mediaData,
        youtube_url: resolvedYoutubeUrl,
        thumbnail_url: resolvedThumbnailUrl,
        created_by: admin.user_id ?? null,
      })
      .select()
      .single();

    if (mediaError || !media) {
      return NextResponse.json({ error: "미디어 생성에 실패했습니다" }, { status: 500 });
    }

    // 멤버 태깅
    if (member_ids.length > 0) {
      const tagRows = member_ids.map((crew_member_id, i) => ({
        media_id: media.id,
        crew_member_id,
        sort_order: i,
      }));
      const { error: tagError } = await supabase
        .from("portfolio_media_members")
        .insert(tagRows);
      if (tagError) {
        // 태깅 실패 시 미디어는 생성된 상태 — 경고만 로그
        console.error("[POST /api/portfolio/media] tag insert error:", tagError);
      }
    }

    // 멤버 포함 재조회
    const { data: result } = await supabase
      .from("portfolio_media")
      .select(`
        *,
        members:portfolio_media_members(
          sort_order,
          crew_member:crew_members(id, stage_name, name, profile_image_url, is_public, is_active)
        )
      `)
      .eq("id", media.id)
      .single();

    const normalized = result
      ? {
          ...result,
          members: (result.members ?? [])
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .map((m: { crew_member: unknown }) => m.crew_member)
            .filter(Boolean),
        }
      : media;

    return NextResponse.json({ data: normalized }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/portfolio/media] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
