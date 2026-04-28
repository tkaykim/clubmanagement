// 도메인 이벤트 → 푸시 알림 발송 헬퍼.
// 모든 함수는 실패해도 호출자 응답에 영향 안 주도록 try/catch + console.error.
// admin_route 컨텍스트에서 호출 → RLS는 admin SELECT 정책으로 우회.

import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { sendPushToSubscriptions, type PushPayload, type PushSubscriptionRow } from "@/lib/push";

type SupaClient = ReturnType<typeof createRouteSupabaseClient>;

async function fetchSubsByUserIds(
  supabase: SupaClient,
  userIds: string[]
): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  return ((data ?? []) as PushSubscriptionRow[]);
}

async function fetchAllSubs(supabase: SupaClient): Promise<PushSubscriptionRow[]> {
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  return ((data ?? []) as PushSubscriptionRow[]);
}

async function send(subs: PushSubscriptionRow[], payload: PushPayload) {
  if (subs.length === 0) return;
  try {
    await sendPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error("[notifications] send failed:", err);
  }
}

// ============================================================
// 대상 헬퍼
// ============================================================

export async function notifyAdmins(payload: PushPayload): Promise<void> {
  try {
    const supabase = createRouteSupabaseClient();
    const { data: members } = await supabase
      .from("crew_members")
      .select("user_id")
      .in("role", ["admin", "owner"])
      .not("user_id", "is", null);
    const userIds = ((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    const subs = await fetchSubsByUserIds(supabase, userIds);
    await send(subs, payload);
  } catch (err) {
    console.error("[notifyAdmins] error:", err);
  }
}

export async function notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const supabase = createRouteSupabaseClient();
    const subs = await fetchSubsByUserIds(supabase, userIds);
    await send(subs, payload);
  } catch (err) {
    console.error("[notifyUsers] error:", err);
  }
}

export async function notifyAllActive(payload: PushPayload): Promise<void> {
  try {
    const supabase = createRouteSupabaseClient();
    const subs = await fetchAllSubs(supabase);
    await send(subs, payload);
  } catch (err) {
    console.error("[notifyAllActive] error:", err);
  }
}

/**
 * visibility 기반 대상 산출:
 *   public   → 활성 멤버 전원
 *   contract → 운영진 + 계약멤버
 *   admin    → 운영진(owner+admin)
 *   private  → 등록자(owner_id) + 크루 owner
 */
export async function notifyVisibility(
  project: { id: string; visibility: string; owner_id: string | null },
  payload: PushPayload
): Promise<void> {
  try {
    const supabase = createRouteSupabaseClient();
    let userIds: string[] = [];

    if (project.visibility === "public") {
      const { data } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("is_active", true)
        .not("user_id", "is", null);
      userIds = ((data ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    } else if (project.visibility === "contract") {
      const { data } = await supabase
        .from("crew_members")
        .select("user_id, role, contract_type")
        .eq("is_active", true)
        .not("user_id", "is", null);
      userIds = ((data ?? []) as Array<{ user_id: string; role: string; contract_type: string }>)
        .filter((m) => m.role === "owner" || m.role === "admin" || m.contract_type === "contract")
        .map((m) => m.user_id);
    } else if (project.visibility === "admin") {
      const { data } = await supabase
        .from("crew_members")
        .select("user_id")
        .in("role", ["admin", "owner"])
        .not("user_id", "is", null);
      userIds = ((data ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    } else if (project.visibility === "private") {
      const owners: string[] = [];
      if (project.owner_id) owners.push(project.owner_id);
      const { data } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("role", "owner")
        .not("user_id", "is", null);
      for (const o of (data ?? []) as Array<{ user_id: string }>) {
        if (!owners.includes(o.user_id)) owners.push(o.user_id);
      }
      userIds = owners;
    }

    const subs = await fetchSubsByUserIds(supabase, userIds);
    await send(subs, payload);
  } catch (err) {
    console.error("[notifyVisibility] error:", err);
  }
}

/** 프로젝트 approved 참여자에게 (선택적으로 owner_id 포함) */
export async function notifyApprovedParticipants(
  projectId: string,
  payload: PushPayload,
  options: { includeOwner?: boolean; includePending?: boolean } = {}
): Promise<void> {
  try {
    const supabase = createRouteSupabaseClient();
    const statuses = options.includePending ? ["approved", "pending"] : ["approved"];
    const { data } = await supabase
      .from("project_applications")
      .select("user_id")
      .eq("project_id", projectId)
      .in("status", statuses)
      .not("user_id", "is", null);
    const userIds = ((data ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);

    if (options.includeOwner) {
      const { data: proj } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", projectId)
        .maybeSingle();
      const ownerId = (proj as { owner_id: string | null } | null)?.owner_id;
      if (ownerId && !userIds.includes(ownerId)) userIds.push(ownerId);
    }

    const subs = await fetchSubsByUserIds(supabase, userIds);
    await send(subs, payload);
  } catch (err) {
    console.error("[notifyApprovedParticipants] error:", err);
  }
}

/** 공지 scope 기반 */
export async function notifyAnnouncementScope(
  scope: string,
  projectId: string | null,
  payload: PushPayload
): Promise<void> {
  try {
    if (scope === "all" || !scope) {
      const supabase = createRouteSupabaseClient();
      const { data } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("is_active", true)
        .not("user_id", "is", null);
      const userIds = ((data ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
      await notifyUsers(userIds, payload);
    } else if (scope === "admin") {
      await notifyAdmins(payload);
    } else if (scope === "project" && projectId) {
      await notifyApprovedParticipants(projectId, payload, { includeOwner: true });
    }
  } catch (err) {
    console.error("[notifyAnnouncementScope] error:", err);
  }
}
