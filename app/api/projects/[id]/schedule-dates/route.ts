import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { scheduleDateCreateSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyApprovedParticipants } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/[id]/schedule-dates — 프로젝트 일정 목록
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const supabase = createRouteSupabaseClient();
    const { data, error } = await supabase
      .from("schedule_dates")
      .select("id, project_id, date, label, kind, sort_order, created_at")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "일정 조회에 실패했습니다" },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/projects/[id]/schedule-dates] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/schedule-dates — 일정 단건 추가 (admin)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = scheduleDateCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // 프로젝트 존재 확인 + 제목 (알림용)
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", projectId)
      .maybeSingle();
    if (projectErr || !project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // sort_order 기본값: 현재 최대값 + 1
    let sortOrder = parsed.data.sort_order;
    if (sortOrder === undefined) {
      const { data: last } = await supabase
        .from("schedule_dates")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder = ((last?.sort_order as number | null) ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from("schedule_dates")
      .insert({
        project_id: projectId,
        date: parsed.data.date,
        label: parsed.data.label ?? null,
        kind: parsed.data.kind,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: `일정 추가 실패: ${error?.message ?? "알 수 없는 오류"}` },
        { status: 500 }
      );
    }

    await logActivity({
      actorUserId: admin.user_id,
      actorName: admin.name,
      action: "schedule_date.create",
      targetType: "project",
      targetId: projectId,
      targetLabel: project.title,
      meta: { schedule_date_id: data.id, date: data.date, kind: data.kind },
    });

    await notifyApprovedParticipants(
      projectId,
      {
        title: "프로젝트에 새 일정 후보가 추가됐어요",
        body: project.title,
        url: `/projects/${projectId}`,
        tag: `project-schedule-${projectId}`,
      },
      { includePending: true }
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects/[id]/schedule-dates] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
