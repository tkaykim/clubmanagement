import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { projectStatusSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyVisibility, notifyApprovedParticipants } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/projects/[id]/status — 프로젝트 상태 변경 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = projectStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // 변경 전 상태 + 제목 + visibility + owner 스냅샷
    const { data: before } = await supabase
      .from("projects")
      .select("status, title, visibility, owner_id")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("projects")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select("id, status, title")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "프로젝트를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "상태 변경에 실패했습니다" },
        { status: 500 }
      );
    }

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "project.status_change",
      targetType: "project",
      targetId: id,
      targetLabel: data.title ?? before?.title ?? null,
      meta: { from: before?.status ?? null, to: data.status },
    });

    // 알림 분기
    const title = data.title ?? before?.title ?? "프로젝트";
    const beforeRow = before as
      | { status: string; title: string; visibility: string; owner_id: string | null }
      | null;
    if (data.status === "recruiting" && beforeRow?.status !== "recruiting") {
      await notifyVisibility(
        { id, visibility: beforeRow?.visibility ?? "public", owner_id: beforeRow?.owner_id ?? null },
        {
          title: "모집이 시작되었어요",
          body: title,
          url: `/projects/${id}`,
          tag: `project-recruit-${id}`,
        }
      );
    } else if (data.status === "cancelled") {
      await notifyApprovedParticipants(
        id,
        {
          title: "프로젝트가 취소되었습니다",
          body: title,
          url: `/projects/${id}`,
          tag: `project-cancel-${id}`,
        },
        { includePending: true }
      );
    } else if (data.status === "completed" && beforeRow?.status !== "completed") {
      await notifyApprovedParticipants(id, {
        title: "프로젝트가 완료되었어요",
        body: `${title} · 정산을 확인해보세요`,
        url: `/mypage?tab=payouts`,
        tag: `project-complete-${id}`,
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/status] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
