import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";

/**
 * GET /api/members/me — 내 프로필 + 통계
 */
export async function GET() {
  try {
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const supabase = createRouteSupabaseClient();

    const [userResult, memberResult, appsResult, payoutsResult] =
      await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase
          .from("crew_members")
          .select("*")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("project_applications")
          .select("id, status, project:projects(id, title, type, status, fee)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("payouts")
          .select("id, amount, status")
          .eq("user_id", userId),
      ]);

    type PayoutRow = { id: string; amount: number; status: string };
    type AppRow = { id: string; status: string };
    const payouts: PayoutRow[] = (payoutsResult.data ?? []) as PayoutRow[];
    const apps: AppRow[] = (appsResult.data ?? []) as AppRow[];
    const stats = {
      application_count: apps.length,
      approved_count: apps.filter((a) => a.status === "approved").length,
      total_earned: payouts
        .filter((p) => p.status === "paid")
        .reduce((s: number, p: PayoutRow) => s + p.amount, 0),
      pending_amount: payouts
        .filter((p) => p.status !== "paid")
        .reduce((s: number, p: PayoutRow) => s + p.amount, 0),
    };

    return NextResponse.json({
      data: {
        user: userResult.data,
        crew_member: memberResult.data,
        applications: appsResult.data ?? [],
        payouts,
        stats,
      },
    });
  } catch (err) {
    console.error("[GET /api/members/me] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
