import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validators";

/**
 * POST /api/projects — 새 프로젝트 생성 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { dates, practiceDates, ...projectData } = parsed.data;
    const supabase = createRouteSupabaseClient();

    // projects.owner_id 는 users(id) FK 이므로 crew_members.user_id 를 사용한다.
    // admin.id (crew_members PK) 를 넣으면 FK 위반 → 500 발생.
    if (!admin.user_id) {
      return NextResponse.json(
        { error: "연결된 사용자 계정이 없어 프로젝트를 생성할 수 없습니다" },
        { status: 400 }
      );
    }

    // 프로젝트 생성
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        ...projectData,
        owner_id: admin.user_id,
      })
      .select()
      .single();

    if (projectError || !project) {
      console.error("[POST /api/projects] project insert error:", projectError);
      return NextResponse.json(
        {
          error: `프로젝트 생성 실패: ${projectError?.message ?? "알 수 없는 오류"}`,
          code: projectError?.code ?? null,
          details: projectError?.details ?? null,
          hint: projectError?.hint ?? null,
        },
        { status: 500 }
      );
    }

    // 이벤트 날짜 삽입
    const allDates = [
      ...(dates ?? []).map((d, i) => ({
        project_id: project.id,
        date: d.date,
        label: d.label ?? null,
        kind: "event" as const,
        sort_order: d.sort_order ?? i,
      })),
      ...(practiceDates ?? []).map((d, i) => ({
        project_id: project.id,
        date: d.date,
        label: d.label ?? null,
        kind: "practice" as const,
        sort_order: (dates?.length ?? 0) + i,
      })),
    ];

    if (allDates.length > 0) {
      const { error: datesError } = await supabase
        .from("schedule_dates")
        .insert(allDates);
      if (datesError) {
        console.error("[POST /api/projects] schedule_dates insert error:", datesError);
        return NextResponse.json(
          {
            error: `일정 저장 실패: ${datesError.message}`,
            code: datesError.code ?? null,
            project_id: project.id,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `서버 오류: ${msg}` },
      { status: 500 }
    );
  }
}
