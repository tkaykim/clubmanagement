import { isNextResponse } from "@/lib/auth";
import { financeAllowanceSaveSchema } from "@/lib/finance";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { financeApiError, financeDbError, financeJson, getFinanceProjectDetail, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ projectId: id });
  if (isNextResponse(identity)) return identity;
  const parsed = financeAllowanceSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return financeApiError(400, "VALIDATION_ERROR", "수당 입력값이 올바르지 않습니다", { details: parsed.error.issues });
  const supabase = createRouteSupabaseClient();
  const { error } = await supabase.rpc("finance_save_allowance_draft", {
    p_actor_user_id: identity.userId,
    p_project_id: id,
    p_expected_revision: parsed.data.expectedRevision,
    p_items: parsed.data.items,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return financeDbError(error);
  const data = await getFinanceProjectDetail(id, identity, supabase);
  if (!data) return financeApiError(404, "NOT_FOUND", "프로젝트 재무를 찾을 수 없습니다");
  return financeJson({ data });
}
