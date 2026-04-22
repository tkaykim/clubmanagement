import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { bulkStatusSchema } from "@/lib/validators";

/**
 * POST /api/applications/bulk-status — 일괄 확정/탈락 처리 (admin)
 * approved 전환 시 payouts 자동 생성
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = bulkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { application_ids, status } = parsed.data;
    const supabase = createRouteSupabaseClient();

    // 대상 지원들 조회
    const { data: applications } = await supabase
      .from("project_applications")
      .select("id, project_id, user_id, status")
      .in("id", application_ids);

    if (!applications || applications.length === 0) {
      return NextResponse.json(
        { error: "처리할 지원이 없습니다" },
        { status: 404 }
      );
    }

    // 상태 일괄 업데이트
    const { error: updateError } = await supabase
      .from("project_applications")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        // NOTE: reviewed_by 는 users(id) FK → admin.user_id 사용
        reviewed_by: admin.user_id,
      })
      .in("id", application_ids);

    if (updateError) {
      return NextResponse.json(
        { error: "일괄 처리에 실패했습니다" },
        { status: 500 }
      );
    }

    // approved 전환 시 payouts 생성
    if (status === "approved") {
      type AppRow = { id: string; project_id: string; user_id: string | null; status: string };
      const toApprove = (applications as AppRow[]).filter(
        (a) => a.status !== "approved" && a.user_id
      );

      if (toApprove.length > 0) {
        // 프로젝트별 fee 조회 (중복 제거)
        const projectIds = [...new Set(toApprove.map((a) => a.project_id))];
        const { data: projects } = await supabase
          .from("projects")
          .select("id, fee")
          .in("id", projectIds);

        const feeMap: Record<string, number> = {};
        for (const p of (projects ?? []) as { id: string; fee: number }[]) {
          feeMap[p.id] = Math.abs(p.fee);
        }

        const payoutRows = toApprove.map((app) => ({
          project_id: app.project_id,
          application_id: app.id,
          user_id: app.user_id,
          amount: feeMap[app.project_id] ?? 0,
          status: "pending" as const,
          // payouts.created_by 는 users(id) FK
          created_by: admin.user_id,
        }));

        await supabase
          .from("payouts")
          .upsert(payoutRows, { onConflict: "application_id" });
      }
    }

    return NextResponse.json({ data: { updated: application_ids.length } });
  } catch (err) {
    console.error("[POST /api/applications/bulk-status] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
