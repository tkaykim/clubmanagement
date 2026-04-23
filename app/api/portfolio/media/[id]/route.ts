import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioMediaInputSchema } from "@/lib/validators";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import { validateUuidParam } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/portfolio/media/[id] — 미디어 수정 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const uuidError = validateUuidParam(id);
    if (uuidError) return uuidError;

    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = portfolioMediaInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { member_ids, youtube_url, thumbnail_url, ...mediaData } = parsed.data;

    const updateData: Record<string, unknown> = { ...mediaData };

    if (youtube_url !== undefined) {
      if (youtube_url) {
        const videoId = extractYouTubeId(youtube_url);
        if (!videoId) {
          return NextResponse.json(
            { error: "유효하지 않은 YouTube URL입니다" },
            { status: 400 }
          );
        }
        updateData.youtube_url = youtube_url;
        if (!thumbnail_url) {
          updateData.thumbnail_url = youtubeThumbnail(videoId, "hq");
        }
      } else {
        updateData.youtube_url = null;
      }
    }

    if (thumbnail_url !== undefined) {
      updateData.thumbnail_url = thumbnail_url;
    }

    const supabase = createRouteSupabaseClient();

    const { data: existing } = await supabase
      .from("portfolio_media")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "미디어를 찾을 수 없습니다" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("portfolio_media")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "미디어 수정에 실패했습니다" }, { status: 500 });
    }

    // 멤버 태깅 교체 (member_ids 제공 시)
    if (member_ids !== undefined) {
      await supabase.from("portfolio_media_members").delete().eq("media_id", id);
      if (member_ids.length > 0) {
        const tagRows = member_ids.map((crew_member_id, i) => ({
          media_id: id,
          crew_member_id,
          sort_order: i,
        }));
        const { error: tagError } = await supabase
          .from("portfolio_media_members")
          .insert(tagRows);
        if (tagError) {
          console.error("[PATCH /api/portfolio/media/[id]] tag error:", tagError);
        }
      }
    }

    // 결과 재조회
    const { data: result } = await supabase
      .from("portfolio_media")
      .select(`
        *,
        members:portfolio_media_members(
          sort_order,
          crew_member:crew_members(id, stage_name, name, profile_image_url, is_public, is_active)
        )
      `)
      .eq("id", id)
      .single();

    const normalized = result
      ? {
          ...result,
          members: (result.members ?? [])
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .map((m: { crew_member: unknown }) => m.crew_member)
            .filter(Boolean),
        }
      : null;

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error("[PATCH /api/portfolio/media/[id]] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * DELETE /api/portfolio/media/[id] — 미디어 삭제 (admin)
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
      .from("portfolio_media")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "미디어를 찾을 수 없습니다" }, { status: 404 });
    }

    const { error } = await supabase.from("portfolio_media").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "미디어 삭제에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    console.error("[DELETE /api/portfolio/media/[id]] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
