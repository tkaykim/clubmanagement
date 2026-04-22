import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/payouts — approved 지원자 기준 payouts 자동 생성 (admin)
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;

    // UUID 검증 — SQL Injection 방지
    const uuidResult = z.string().uuid().safeParse(projectId);
    if (!uuidResult.success) {
      return NextResponse.json(
        { error: "잘못된 프로젝트 ID입니다" },
        { status: 400 }
      );
    }

    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const supabase = createRouteSupabaseClient();

    // 프로젝트 fee 조회
    const { data: project } = await supabase
      .from("projects")
      .select("id, fee")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 payout이 생성된 application_id 목록 조회 (raw SQL 서브쿼리 제거)
    const { data: existingPayouts } = await supabase
      .from("payouts")
      .select("application_id")
      .eq("project_id", projectId);
    const existingAppIds = (existingPayouts ?? []).map(
      (p: { application_id: string }) => p.application_id
    );

    // 확정된 지원자 조회 (이미 payout이 있는 경우 제외)
    let approvedQuery = supabase
      .from("project_applications")
      .select("id, user_id")
      .eq("project_id", projectId)
      .eq("status", "approved");

    if (existingAppIds.length > 0) {
      approvedQuery = approvedQuery.not(
        "id",
        "in",
        `(${existingAppIds.join(",")})`
      );
    }

    const { data: approved } = await approvedQuery;

    if (!approved || approved.length === 0) {
      return NextResponse.json({ data: { created: 0 } });
    }

    const payoutRows = (approved as { id: string; user_id: string | null }[]).map((app) => ({
      project_id: projectId,
      application_id: app.id,
      user_id: app.user_id,
      amount: Math.abs((project as { fee: number }).fee),
      status: "pending",
      // payouts.created_by 는 users(id) FK → admin.user_id 사용
      created_by: admin.user_id,
    }));

    const { data: created, error } = await supabase
      .from("payouts")
      .insert(payoutRows)
      .select();

    if (error) {
      console.error("[POST /api/projects/[id]/payouts] error:", error);
      return NextResponse.json(
        { error: "정산 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { created: (created ?? []).length } });
  } catch (err) {
    console.error("[POST /api/projects/[id]/payouts] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
