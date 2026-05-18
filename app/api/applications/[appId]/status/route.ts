import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { applicationStatusSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyUsers } from "@/lib/notifications";

type Params = { params: Promise<{ appId: string }> };

/**
 * PATCH /api/applications/[appId]/status — 개별 지원 상태 변경 (admin)
 * 승인 시 payouts 레코드 자동 생성
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { appId } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = applicationStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // 현재 지원 조회
    const { data: existing } = await supabase
      .from("project_applications")
      .select("id, project_id, user_id, status")
      .eq("id", appId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "지원 내역을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 상태 업데이트
    // NOTE: reviewed_by / created_by 모두 users(id) FK 이므로 admin.user_id 사용
    const updatePayload: Record<string, unknown> = {
      status: parsed.data.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.user_id,
    };
    if (parsed.data.memo !== undefined) updatePayload.memo = parsed.data.memo;
    if (parsed.data.score !== undefined) updatePayload.score = parsed.data.score;

    const { data: application, error } = await supabase
      .from("project_applications")
      .update(updatePayload)
      .eq("id", appId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "상태 변경에 실패했습니다" },
        { status: 500 }
      );
    }

    // approved로 전환 시 payouts 자동 생성
    if (
      parsed.data.status === "approved" &&
      existing.status !== "approved" &&
      existing.user_id
    ) {
      const { data: project } = await supabase
        .from("projects")
        .select("fee")
        .eq("id", existing.project_id)
        .single();

      if (project) {
        await supabase.from("payouts").upsert(
          {
            project_id: existing.project_id,
            application_id: appId,
            user_id: existing.user_id,
            amount: Math.abs(project.fee),
            status: "pending",
            created_by: admin.user_id,
          },
          { onConflict: "application_id" }
        );
      }
    }

    // 프로젝트 제목 + 알림 + 로그
    const { data: proj } = await supabase
      .from("projects")
      .select("title")
      .eq("id", existing.project_id)
      .maybeSingle();
    const projTitle = (proj as { title: string } | null)?.title ?? "프로젝트";

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "application.status_change",
      targetType: "application",
      targetId: appId,
      targetLabel: projTitle,
      meta: { from: existing.status, to: parsed.data.status, projectId: existing.project_id },
    });

    // P0 #4: 지원 결과 알림 (지원자 본인)
    if (existing.user_id && parsed.data.status !== existing.status) {
      const isApproved = parsed.data.status === "approved";
      const isRejected = parsed.data.status === "rejected";
      if (isApproved || isRejected) {
        await notifyUsers([existing.user_id], {
          title: isApproved
            ? "프로젝트 합류 확정"
            : `${projTitle} 지원 결과 알림`,
          body: isApproved
            ? `${projTitle} 합류가 확정되었어요 🎉`
            : `${projTitle}는 이번에 함께하지 못했지만, 다음 프로젝트에서 또 만나요 🙌`,
          url: `/projects/${existing.project_id}`,
          tag: `app-result-${appId}`,
        });
      }
    }

    return NextResponse.json({ data: application });
  } catch (err) {
    console.error("[PATCH /api/applications/[appId]/status] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
