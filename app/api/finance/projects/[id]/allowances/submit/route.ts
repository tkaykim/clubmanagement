import { isNextResponse } from "@/lib/auth";
import { financeTransitionSchema } from "@/lib/finance";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { financeApiError, financeDbError, financeJson, getFinanceProjectDetail, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ projectId: id });
  if (isNextResponse(identity)) return identity;
  const parsed = financeTransitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return financeApiError(400, "VALIDATION_ERROR", "제출 입력값이 올바르지 않습니다", { details: parsed.error.issues });
  const supabase = createRouteSupabaseClient();
  const { error } = await supabase.rpc("finance_submit_allowance_batch", {
    p_actor_user_id: identity.userId,
    p_project_id: id,
    p_expected_revision: parsed.data.expectedRevision,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return financeDbError(error);
  const data = await getFinanceProjectDetail(id, identity, supabase);
  return data ? financeJson({ data }) : financeApiError(404, "NOT_FOUND", "프로젝트 재무를 찾을 수 없습니다");
}
