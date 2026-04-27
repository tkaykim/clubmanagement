import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/validators";

/**
 * POST /api/push/subscribe — 현재 사용자의 푸시 구독 정보 저장 (upsert by endpoint)
 */
export async function POST(request: Request) {
  try {
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const body = await request.json();
    const parsed = pushSubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { endpoint, keys, ua } = parsed.data;

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          ua: ua ?? null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[POST /api/push/subscribe] db error:", error);
      return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[POST /api/push/subscribe] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe — 현재 사용자의 특정 endpoint 구독 해제
 */
export async function DELETE(request: Request) {
  try {
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const body = await request.json();
    const parsed = pushUnsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", parsed.data.endpoint);

    if (error) {
      console.error("[DELETE /api/push/subscribe] db error:", error);
      return NextResponse.json({ error: "해제에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/push/subscribe] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
