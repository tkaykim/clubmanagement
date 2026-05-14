import { createRouteSupabaseClient } from "@/lib/supabase-server";

export type ActivityAction =
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.status_change"
  | "application.create"
  | "application.update"
  | "application.withdraw"
  | "application.status_change"
  | "schedule_date.create"
  | "schedule_date.update"
  | "schedule_date.delete"
  | "push.send";

export type ActivityTargetType = "project" | "application" | "push" | null;

export interface LogActivityInput {
  actorUserId: string | null;
  actorName?: string | null;
  action: ActivityAction;
  targetType?: ActivityTargetType;
  targetId?: string | null;
  targetLabel?: string | null;
  meta?: Record<string, unknown> | null;
}

/**
 * 활동 로그 기록. 실패해도 호출자의 응답에 영향을 주지 않도록 try/catch + console.error.
 * RLS: 인증 사용자는 본인 행동만 insert 가능, 게스트는 actor_user_id null만 가능.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = createRouteSupabaseClient();
    const { error } = await supabase.from("activity_logs").insert({
      actor_user_id: input.actorUserId,
      actor_name: input.actorName ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      target_label: input.targetLabel ?? null,
      meta: input.meta ?? null,
    });
    if (error) {
      console.error("[activity-log] insert failed:", error.message, input);
    }
  } catch (err) {
    console.error("[activity-log] unexpected error:", err);
  }
}

export const ACTION_LABELS: Record<string, string> = {
  "project.create": "프로젝트 생성",
  "project.update": "프로젝트 수정",
  "project.delete": "프로젝트 삭제",
  "project.status_change": "프로젝트 상태 변경",
  "application.create": "지원 제출",
  "application.update": "지원 수정",
  "application.withdraw": "지원 취소",
  "application.status_change": "지원 상태 변경",
  "push.send": "푸시 알림 발송",
};
