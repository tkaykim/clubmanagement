import { isNextResponse } from "@/lib/auth";
import { financeReceiptSchema } from "@/lib/finance";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { financeApiError, financeDbError, financeJson, getFinanceProjectDetail, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ global: true });
  if (isNextResponse(identity)) return identity;
  const parsed = financeReceiptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return financeApiError(400, "VALIDATION_ERROR", "수금 입력값이 올바르지 않습니다", { details: parsed.error.issues });
  const supabase = createRouteSupabaseClient();
  const { error } = await supabase.rpc("finance_record_receipt", {
    p_actor_user_id: identity.userId,
    p_project_id: id,
    p_payload: parsed.data,
  });
  if (error) return financeDbError(error);
  const data = await getFinanceProjectDetail(id, identity, supabase);
  return data ? financeJson({ data }) : financeApiError(404, "NOT_FOUND", "프로젝트 재무를 찾을 수 없습니다");
}
