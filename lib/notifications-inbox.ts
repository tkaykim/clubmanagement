// In-app notification inbox writes — fallback for push delivery.
// 모든 함수는 실패해도 호출자 응답에 영향 안 주도록 try/catch + console.error.

import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase-server";

type SupaClient = ReturnType<typeof createRouteSupabaseClient>;

function getSupa(): SupaClient {
  const service = createServiceSupabaseClient();
  return (service ?? createRouteSupabaseClient()) as SupaClient;
}

export interface InboxPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  targetType?: string;
  targetId?: string | null;
}

/**
 * 주어진 user_id 들에게 in-app 알림 행 인서트.
 * push 발송 결과와 무관하게 인박스에는 항상 기록 — 푸시 미구독 사용자에게도 도달 보장.
 */
export async function createUserNotifications(
  userIds: string[],
  payload: InboxPayload
): Promise<void> {
  try {
    if (userIds.length === 0) return;
    const uniq = Array.from(new Set(userIds));
    const supabase = getSupa();
    const rows = uniq.map((uid) => ({
      user_id: uid,
      title: payload.title,
      body: payload.body ?? null,
      url: payload.url ?? null,
      tag: payload.tag ?? null,
      target_type: payload.targetType ?? null,
      target_id: payload.targetId ?? null,
    }));
    const { error } = await supabase.from("user_notifications").insert(rows);
    if (error) {
      console.error("[createUserNotifications] insert error:", error);
    }
  } catch (err) {
    console.error("[createUserNotifications] error:", err);
  }
}
