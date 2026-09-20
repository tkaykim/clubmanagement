import { isNextResponse } from "@/lib/auth";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { financeApiError, financeJson, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ projectId: id });
  if (isNextResponse(identity)) return identity;
  const search = new URL(request.url).searchParams;
  const limit = Math.min(100, Math.max(1, Number(search.get("limit") ?? 50)));
  let query = createRouteSupabaseClient()
    .from("finance_audit_events")
    .select("id,project_id,actor_user_id,action,entity_type,entity_id,reason,occurred_at")
    .eq("project_id", id)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  const cursor = search.get("cursor");
  if (cursor) query = query.lt("occurred_at", cursor);
  const { data, error } = await query;
  if (error) return financeApiError(500, "INTERNAL_ERROR", "감사 이력을 불러오지 못했습니다");
  const page = (data ?? []).slice(0, limit);
  return financeJson({
    data: page.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      actorUserId: row.actor_user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      reason: row.reason,
      occurredAt: row.occurred_at,
    })),
    nextCursor: (data ?? []).length > limit ? page[page.length - 1]?.occurred_at ?? null : null,
  });
}
