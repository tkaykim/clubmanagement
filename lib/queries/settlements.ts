import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { PayoutWithMember, SettlementMember } from "@/lib/types";

/**
 * 월별 팀 정산 요약 (admin용)
 * month: "YYYY-MM"
 */
export async function getSettlementsMonthly(
  month: string
): Promise<SettlementMember[]> {
  const supabase = createServerSupabaseClient();

  // payouts + project + user + crew_member JOIN
  const { data, error } = await supabase
    .from("payouts")
    .select(
      `
      id, amount, status, scheduled_at, paid_at,
      user_id,
      project:projects(id, title, start_date),
      application:project_applications(id),
      crew_member:crew_members!crew_members_user_id_fkey(id, name, stage_name)
    `
    )
    .not("user_id", "is", null);

  if (error || !data) return [];

  type PayoutRaw = {
    id: string;
    amount: number;
    status: string;
    scheduled_at: string | null;
    paid_at: string | null;
    user_id: string | null;
    project: { id: string; title: string; start_date: string | null } | null;
    application: { id: string } | null;
    crew_member: { id: string; name: string; stage_name: string | null } | null;
  };
  const typedData = data as unknown as PayoutRaw[];

  // 클라이언트에서 month 필터링 (scheduled_at 우선, null이면 project.start_date)
  const filtered = typedData.filter((p) => {
    const dateStr = p.scheduled_at ?? p.project?.start_date;
    if (!dateStr) return false;
    return dateStr.startsWith(month);
  });

  // user_id별 집계
  const map: Record<string, SettlementMember> = {};
  for (const row of filtered) {
    const userId = row.user_id as string;
    const cm = row.crew_member;
    if (!map[userId]) {
      map[userId] = {
        user_id: userId,
        name: cm?.name ?? "",
        stage_name: cm?.stage_name ?? null,
        project_count: 0,
        total_amount: 0,
        paid_amount: 0,
        scheduled_amount: 0,
        pending_amount: 0,
      };
    }
    const entry = map[userId];
    entry.project_count += 1;
    entry.total_amount += row.amount;
    if (row.status === "paid") entry.paid_amount += row.amount;
    else if (row.status === "scheduled") entry.scheduled_amount += row.amount;
    else entry.pending_amount += row.amount;
  }

  return Object.values(map).sort((a, b) => b.total_amount - a.total_amount);
}

/**
 * 프로젝트별 정산 목록
 */
export async function getPayoutsByProject(
  projectId: string
): Promise<PayoutWithMember[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payouts")
    .select(
      `*, crew_member:crew_members!crew_members_user_id_fkey(*)`
    )
    .eq("project_id", projectId)
    .order("created_at");

  if (error || !data) return [];
  return data as PayoutWithMember[];
}

/**
 * 내 정산 이력
 */
export async function getMyPayouts(userId: string): Promise<PayoutWithMember[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payouts")
    .select(`*, project:projects(id, title)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PayoutWithMember[];
}
