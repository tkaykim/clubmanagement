import { isNextResponse } from "@/lib/auth";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { financeApiError, financeJson, requireFinanceIdentity } from "@/lib/finance-server";

export async function GET() {
  const identity = await requireFinanceIdentity();
  if (isNextResponse(identity)) return identity;
  if (!identity.isGlobal && identity.managedProjectIds.length === 0) {
    return financeApiError(403, "FORBIDDEN", "재무 프로젝트 권한이 없습니다");
  }
  const supabase = createRouteSupabaseClient();
  const { data, error } = await supabase
    .from("crew_members")
    .select("id,user_id,name,stage_name,profile_image_url")
    .eq("is_active", true)
    .not("user_id", "is", null)
    .order("name", { ascending: true });
  if (error) return financeApiError(500, "INTERNAL_ERROR", "담당자 후보를 불러오지 못했습니다");
  return financeJson({
    data: (data ?? []).map((row) => ({
      crewMemberId: row.id,
      userId: row.user_id,
      name: row.stage_name || row.name,
      profileImageUrl: row.profile_image_url ?? null,
    })),
  });
}
