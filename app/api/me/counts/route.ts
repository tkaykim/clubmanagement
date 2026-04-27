import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";

/**
 * GET /api/me/counts — 사이드바/네비 뱃지에 쓰이는 카운트 묶음
 * 짧은 캐시(s-maxage=10)로 모든 nav마다 풀 SSR 하던 부하 제거.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const authOrResponse = await requireAuth();
  if (isNextResponse(authOrResponse)) return authOrResponse;
  const { userId } = authOrResponse;

  const supabase = createRouteSupabaseClient();

  const [projResult, annResult, pendingResult, inquiryResult, memberRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .in("status", ["recruiting", "in_progress"]),
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("pinned", true),
      supabase
        .from("project_applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending"),
      supabase
        .from("portfolio_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("crew_members")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const role = (memberRes.data as { role?: string } | null)?.role;
  const isAdminOrOwner = role === "admin" || role === "owner";

  return NextResponse.json(
    {
      data: {
        projects: projResult.count ?? 0,
        unreadAnn: annResult.count ?? 0,
        myPending: pendingResult.count ?? 0,
        // admin 전용 카운트는 비-admin엔 0
        newInquiry: isAdminOrOwner ? inquiryResult.count ?? 0 : 0,
      },
    },
    {
      headers: {
        // 같은 사용자의 짧은 시간 내 반복 nav는 엣지 캐시로 흡수
        "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
      },
    }
  );
}
