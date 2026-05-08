import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { updateProjectSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyApprovedParticipants } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/projects/[id] — 프로젝트 수정 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { dates, practiceDates, ...updateData } = parsed.data;
    const supabase = createRouteSupabaseClient();

    const { data, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "프로젝트를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "프로젝트 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    // 날짜 업데이트 (dates/practiceDates 제공 시 기존 삭제 후 재삽입)
    if (dates !== undefined || practiceDates !== undefined) {
      await supabase.from("schedule_dates").delete().eq("project_id", id);

      const allDates = [
        ...(dates ?? []).map((d, i) => ({
          project_id: id,
          date: d.date,
          label: d.label ?? null,
          kind: "event" as const,
          sort_order: i,
        })),
        ...(practiceDates ?? []).map((d, i) => ({
          project_id: id,
          date: d.date,
          label: d.label ?? null,
          kind: "practice" as const,
          sort_order: (dates?.length ?? 0) + i,
        })),
      ];

      if (allDates.length > 0) {
        await supabase.from("schedule_dates").insert(allDates);
      }
    }

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "project.update",
      targetType: "project",
      targetId: id,
      targetLabel: data?.title ?? null,
      meta: { changedFields: Object.keys(updateData) },
    });

    // 일정 변경 시 approved 참여자에게 알림
    if (dates !== undefined || practiceDates !== undefined) {
      await notifyApprovedParticipants(id, {
        title: "프로젝트 일정이 변경되었어요",
        body: data?.title ?? "프로젝트",
        url: `/projects/${id}`,
        tag: `project-schedule-${id}`,
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id] — 프로젝트 삭제 (admin/owner)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const supabase = createRouteSupabaseClient();

    // 삭제 전 제목 스냅샷 (로그용)
    const { data: existing } = await supabase
      .from("projects")
      .select("title, status")
      .eq("id", id)
      .maybeSingle();

    // RLS 가 막으면 supabase-js 는 error 없이 0 rows 만 반환한다 — silently 실패 방지를 위해
    // .select() 를 함께 호출해 실제 삭제된 row 를 확인.
    const { data: deletedRows, error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("[DELETE /api/projects/[id]] error:", error);
      return NextResponse.json(
        { error: `프로젝트 삭제에 실패했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    if (!deletedRows || deletedRows.length === 0) {
      // 존재하지 않거나 RLS 차단
      const { data: stillExists } = await supabase
        .from("projects")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (stillExists) {
        console.error("[DELETE /api/projects/[id]] silent RLS block — project still exists:", id);
        return NextResponse.json(
          { error: "삭제 권한이 없거나 RLS 정책에 의해 차단되었습니다" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "project.delete",
      targetType: "project",
      targetId: id,
      targetLabel: existing?.title ?? null,
      meta: { lastStatus: existing?.status ?? null },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
