import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { CrewMember } from "@/lib/types";

export type MemberFilter = {
  contract?: string;
  active?: boolean;
  search?: string;
};

/**
 * 멤버 목록 조회
 */
export async function getMembers(
  filter: MemberFilter = {}
): Promise<CrewMember[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("crew_members")
    .select("*")
    .order("joined_at");

  if (filter.contract && filter.contract !== "all") {
    query = query.eq("contract_type", filter.contract);
  }
  if (filter.active !== undefined) {
    query = query.eq("is_active", filter.active);
  }
  if (filter.search) {
    query = query.or(
      `name.ilike.%${filter.search}%,stage_name.ilike.%${filter.search}%`
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as CrewMember[];
}

/**
 * 멤버 단건 조회 (user_id 기준)
 */
export async function getMemberByUserId(
  userId: string
): Promise<CrewMember | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("crew_members")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data as CrewMember | null;
}

/**
 * 특정 멤버의 참여 프로젝트 + 정산 통계
 */
export async function getMemberStats(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data: applications } = await supabase
    .from("project_applications")
    .select(`id, status, project:projects(id, title, type, status, fee)`)
    .eq("user_id", userId);

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, status")
    .eq("user_id", userId);

  type PayoutRow = { id: string; amount: number; status: string };
  const payoutList: PayoutRow[] = (payouts ?? []) as PayoutRow[];
  return {
    applications: applications ?? [],
    payouts: payoutList,
    totalEarned: payoutList
      .filter((p) => p.status === "paid")
      .reduce((sum: number, p: PayoutRow) => sum + (p.amount ?? 0), 0),
    pendingAmount: payoutList
      .filter((p) => p.status !== "paid")
      .reduce((sum: number, p: PayoutRow) => sum + (p.amount ?? 0), 0),
  };
}
