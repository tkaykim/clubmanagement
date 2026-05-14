import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";

/**
 * GET /api/notifications
 *   ?unread=1 — 미읽 count만 반환 ({ data: { unread: number } })
 *   기본 — 최근 50건 목록 + unread count
 */
export async function GET(request: Request) {
  try {
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1";

    const supabase = createRouteSupabaseClient();

    const { count: unread } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (unreadOnly) {
      return NextResponse.json({ data: { unread: unread ?? 0 } });
    }

    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, title, body, url, tag, target_type, target_id, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "알림 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { items: data ?? [], unread: unread ?? 0 } });
  } catch (err) {
    console.error("[GET /api/notifications] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
});

/**
 * PATCH /api/notifications — 알림 읽음 처리
 *   { ids: [...] } — 지정 ID 읽음
 *   { markAll: true } — 본인의 모든 미읽 알림 읽음
 */
export async function PATCH(request: Request) {
  try {
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const now = new Date().toISOString();

    let query = supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);

    if (parsed.data.markAll) {
      // 모든 미읽 처리 — 조건 그대로
    } else if (parsed.data.ids && parsed.data.ids.length > 0) {
      query = query.in("id", parsed.data.ids);
    } else {
      return NextResponse.json(
        { error: "ids 또는 markAll 중 하나가 필요합니다" },
        { status: 400 }
      );
    }

    const { error, data: updated } = await query.select("id");
    if (error) {
      return NextResponse.json(
        { error: "읽음 처리에 실패했습니다" },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: { updated: updated?.length ?? 0 } });
  } catch (err) {
    console.error("[PATCH /api/notifications] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
