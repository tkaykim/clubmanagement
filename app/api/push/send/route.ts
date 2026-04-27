import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, getSession, isNextResponse } from "@/lib/auth";
import { pushSendSchema } from "@/lib/validators";
import { sendPushToSubscriptions, type PushSubscriptionRow } from "@/lib/push";

/**
 * POST /api/push/send — 푸시 알림 발송 (admin)
 * target.kind: all | self | users | role | project
 */
export async function POST(request: Request) {
  try {
    // self 발송은 인증만 있으면 허용 (테스트용). 그 외는 admin.
    const body = await request.json();
    const parsed = pushSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { title, body: msg, url, target } = parsed.data;

    let currentUserId: string | null = null;
    if (target.kind === "self") {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
      }
      currentUserId = session.userId;
    } else {
      const adminOrResponse = await requireAdmin();
      if (isNextResponse(adminOrResponse)) return adminOrResponse;
    }

    const supabase = createRouteSupabaseClient();

    // 1) 대상 user_id 집합 산출
    let userIds: string[] | null = null; // null = 전체
    if (target.kind === "all") {
      userIds = null;
    } else if (target.kind === "self") {
      userIds = currentUserId ? [currentUserId] : [];
    } else if (target.kind === "users") {
      userIds = target.userIds;
    } else if (target.kind === "role") {
      const { data } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("role", target.role)
        .not("user_id", "is", null);
      userIds = ((data ?? []) as Array<{ user_id: string | null }>)
        .map((r) => r.user_id)
        .filter((v): v is string => !!v);
    } else if (target.kind === "project") {
      // 해당 프로젝트의 승인된 참여자
      const { data } = await supabase
        .from("project_applications")
        .select("user_id")
        .eq("project_id", target.projectId)
        .eq("status", "approved");
      userIds = ((data ?? []) as Array<{ user_id: string | null }>)
        .map((r) => r.user_id)
        .filter((v): v is string => !!v);
    }

    // 2) push_subscriptions 조회
    let subsQuery = supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");
    if (userIds !== null) {
      if (userIds.length === 0) {
        return NextResponse.json({ data: { sent: 0, failed: 0, total: 0 } });
      }
      subsQuery = subsQuery.in("user_id", userIds);
    }
    const { data: subsData, error: subsErr } = await subsQuery;

    if (subsErr) {
      console.error("[push/send] sub fetch error:", subsErr);
      return NextResponse.json({ error: "구독 조회에 실패했습니다" }, { status: 500 });
    }

    const subs = (subsData ?? []) as PushSubscriptionRow[];

    if (subs.length === 0) {
      return NextResponse.json({ data: { sent: 0, failed: 0, total: 0 } });
    }

    // 3) 발송
    const result = await sendPushToSubscriptions(subs, {
      title,
      body: msg,
      url: url ?? undefined,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[POST /api/push/send] error:", err);
    const msg = err instanceof Error ? err.message : "서버 오류가 발생했습니다";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
