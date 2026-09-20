import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { bulkStatusSchema } from "@/lib/validators";

/**
 * POST /api/applications/bulk-status — 일괄 확정/탈락 처리 (admin)
 *
 * 지원 승인과 금전 약정은 별개다.
 * 개인별 수당은 finance 전용 흐름에서만 작성한다.
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

    return NextResponse.json({ data: { updated: application_ids.length } });
  } catch (err) {
    console.error("[POST /api/applications/bulk-status] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
