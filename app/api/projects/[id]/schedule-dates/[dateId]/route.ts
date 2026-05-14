import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { scheduleDatePatchSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyApprovedParticipants } from "@/lib/notifications";

type Params = { params: Promise<{ id: string; dateId: string }> };

/**
 * PATCH /api/projects/[id]/schedule-dates/[dateId] — 일정 단건 수정 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: projectId, dateId } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = scheduleDatePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    const { data: project } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
    if (parsed.data.label !== undefined) updateData.label = parsed.data.label;
    if (parsed.data.kind !== undefined) updateData.kind = parsed.data.kind;
    if (parsed.data.sort_order !== undefined) updateData.sort_order = parsed.data.sort_order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "변경할 필드가 없습니다" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("schedule_dates")
      .update(updateData)
      .eq("id", dateId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return NextResponse.json(
          { error: "일정을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `일정 수정 실패: ${error?.message ?? "알 수 없는 오류"}` },
        { status: 500 }
      );
    }

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "schedule_date.update",
      targetType: "project",
      targetId: projectId,
      targetLabel: project.title,
      meta: { schedule_date_id: dateId, changed: Object.keys(updateData) },
    });

    await notifyApprovedParticipants(
      projectId,
      {
        title: "프로젝트 일정이 변경됐어요",
        body: project.title,
        url: `/projects/${projectId}`,
        tag: `project-schedule-${projectId}`,
      },
      { includePending: true }
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/schedule-dates/[dateId]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/schedule-dates/[dateId] — 일정 단건 삭제 (admin)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id: projectId, dateId } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const supabase = createRouteSupabaseClient();

    const { data: project } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { data: deleted, error } = await supabase
      .from("schedule_dates")
      .delete()
      .eq("id", dateId)
      .eq("project_id", projectId)
      .select("id, date, kind");

    if (error) {
      return NextResponse.json(
        { error: `일정 삭제 실패: ${error.message}` },
        { status: 500 }
      );
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { error: "일정을 찾을 수 없거나 삭제 권한이 없습니다" },
        { status: 404 }
      );
    }

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "schedule_date.delete",
      targetType: "project",
      targetId: projectId,
      targetLabel: project.title,
      meta: { schedule_date_id: dateId, date: deleted[0].date, kind: deleted[0].kind },
    });

    await notifyApprovedParticipants(
      projectId,
      {
        title: "프로젝트 일정이 삭제됐어요",
        body: project.title,
        url: `/projects/${projectId}`,
        tag: `project-schedule-${projectId}`,
      },
      { includePending: true }
    );

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]/schedule-dates/[dateId]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
