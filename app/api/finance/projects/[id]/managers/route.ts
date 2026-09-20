import { isNextResponse } from "@/lib/auth";
import { financeManagersSchema } from "@/lib/finance";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { financeApiError, financeDbError, financeJson, getFinanceProjectDetail, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ global: true });
  if (isNextResponse(identity)) return identity;
  const parsed = financeManagersSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return financeApiError(400, "VALIDATION_ERROR", "담당자 입력값이 올바르지 않습니다", { details: parsed.error.issues });
  const supabase = createRouteSupabaseClient();
  const { error } = await supabase.rpc("finance_set_project_managers", {
    p_actor_user_id: identity.userId,
    p_project_id: id,
    p_expected_version: parsed.data.expectedVersion,
    p_managers: parsed.data.managers,
    p_reason: parsed.data.reason,
  });
  if (error) return financeDbError(error);
  const data = await getFinanceProjectDetail(id, identity, supabase);
  if (!data) return financeApiError(404, "NOT_FOUND", "프로젝트 재무를 찾을 수 없습니다");
  return financeJson({ data });
}
