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
    let data;

    // 일정과 프로젝트 필드는 한 트랜잭션에서 갱신하고, 동일 날짜/종류의 ID와 투표는 보존한다.
    if (dates !== undefined || practiceDates !== undefined) {
      const allDates = [
        ...(dates ?? []).map((d, i) => ({
          date: d.date,
          label: d.label ?? null,
          kind: "event" as const,
          sort_order: i,
        })),
        ...(practiceDates ?? []).map((d, i) => ({
          date: d.date,
          label: d.label ?? null,
          kind: "practice" as const,
          sort_order: (dates?.length ?? 0) + i,
        })),
      ];

      const { error: updateError } = await supabase.rpc(
        "update_project_with_schedule",
        {
          p_project_id: id,
          p_project_updates: updateData,
          p_dates: allDates,
        }
      );
      if (updateError) {
        console.error("[PATCH /api/projects/[id]] atomic update error:", updateError);
        return NextResponse.json(
          { error: "프로젝트 일정 수정에 실패했습니다" },
          { status: 500 }
        );
      }
      const result = await supabase.from("projects").select().eq("id", id).single();
      if (result.error || !result.data) {
        return NextResponse.json(
          { error: "프로젝트 수정 결과를 불러오지 못했습니다" },
          { status: 500 }
        );
      }
      data = result.data;
    } else {
      const result = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (result.error) {
        if (result.error.code === "PGRST116") {
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
      data = result.data;
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
      await notifyApprovedParticipants(
        id,
        {
          title: "프로젝트 일정이 변경되었어요",
          body: data?.title ?? "프로젝트",
          url: `/projects/${id}`,
          tag: `project-schedule-${id}`,
        },
        { includePending: true }
      );
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
