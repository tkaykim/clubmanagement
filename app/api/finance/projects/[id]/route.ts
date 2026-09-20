import { isNextResponse } from "@/lib/auth";
import { financeApiError, financeJson, getFinanceProjectDetail, requireFinanceIdentity } from "@/lib/finance-server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const identity = await requireFinanceIdentity({ projectId: id });
  if (isNextResponse(identity)) return identity;
  const data = await getFinanceProjectDetail(id, identity);
  if (!data) return financeApiError(404, "NOT_FOUND", "프로젝트 재무를 찾을 수 없습니다");
  return financeJson({ data });
}
