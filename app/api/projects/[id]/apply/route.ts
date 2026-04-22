import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { getSession } from "@/lib/auth";
import { applySchema, updateApplySchema, type VoteSubmitInput } from "@/lib/validators";

type VoteEntry = NonNullable<VoteSubmitInput["votes"]>[string];

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/[id]/apply — 지원 제출 (게스트 허용)
 * 지원 레코드 생성 + schedule_votes UPSERT (트랜잭션 대신 순차 처리)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await getSession(); // nullable (게스트 허용)

    const body = await request.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { votes, ...appData } = parsed.data;
    const supabase = createRouteSupabaseClient();

    // 프로젝트 존재 + 모집 상태 확인
    const { data: project } = await supabase
      .from("projects")
      .select("id, status, max_participants")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (project.status !== "recruiting") {
      return NextResponse.json(
        { error: "현재 모집 중인 프로젝트가 아닙니다" },
        { status: 400 }
      );
    }

    // 인증된 경우 중복 지원 확인
    if (session) {
      const { data: existing } = await supabase
        .from("project_applications")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", session.userId)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "이미 이 프로젝트에 지원했습니다" },
          { status: 409 }
        );
      }
    }

    // 게스트 필드 검증
    if (!session && !appData.guest_name) {
      return NextResponse.json(
        { error: "게스트 지원 시 이름이 필요합니다" },
        { status: 400 }
      );
    }

    // 지원 레코드 생성
    const { data: application, error: appError } = await supabase
      .from("project_applications")
      .insert({
        project_id: projectId,
        user_id: session?.userId ?? null,
        guest_name: session ? null : (appData.guest_name ?? null),
        guest_email: session ? null : (appData.guest_email ?? null),
        guest_phone: session ? null : (appData.guest_phone ?? null),
        motivation: appData.motivation ?? null,
        fee_agreement: appData.fee_agreement,
        answers_note: appData.answers_note ?? null,
        answers: appData.answers ?? {},
        status: "pending",
      })
      .select()
      .single();

    if (appError || !application) {
      console.error("[POST /api/projects/[id]/apply] application error:", appError);
      return NextResponse.json(
        { error: "지원 제출에 실패했습니다" },
        { status: 500 }
      );
    }

    // 가용성 votes UPSERT (인증된 경우만)
    if (session && votes && Object.keys(votes).length > 0) {
      const voteRows = Object.entries(votes).map(([scheduleDateId, rawVote]) => {
        const voteData = rawVote as VoteEntry;
        return {
          schedule_date_id: scheduleDateId,
          user_id: session.userId,
          status: voteData.status,
          time_slots: voteData.time_slots ?? [],
          note: voteData.note ?? null,
          updated_by: session.userId,
        };
      });

      const { error: votesError } = await supabase
        .from("schedule_votes")
        .upsert(voteRows, {
          onConflict: "schedule_date_id,user_id",
        });

      if (votesError) {
        console.error("[POST /api/projects/[id]/apply] votes error:", votesError);
        // votes 실패해도 지원은 성공으로 처리
      }
    }

    return NextResponse.json(
      { data: { applicationId: application.id } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/projects/[id]/apply] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/apply — 지원 수정 (본인 인증 필요)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = updateApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { votes, ...updateData } = parsed.data;
    const supabase = createRouteSupabaseClient();

    // 기존 지원 확인
    const { data: existing } = await supabase
      .from("project_applications")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("user_id", session.userId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "지원 내역이 없습니다" },
        { status: 404 }
      );
    }

    if (existing.status === "approved") {
      return NextResponse.json(
        { error: "이미 확정된 지원은 수정할 수 없습니다" },
        { status: 400 }
      );
    }

    // 지원 업데이트
    const { data: application, error } = await supabase
      .from("project_applications")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "지원 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    // 가용성 업데이트
    if (votes && Object.keys(votes).length > 0) {
      const voteRows = Object.entries(votes).map(([scheduleDateId, rawVote]) => {
        const voteData = rawVote as VoteEntry;
        return {
          schedule_date_id: scheduleDateId,
          user_id: session.userId,
          status: voteData.status,
          time_slots: voteData.time_slots ?? [],
          note: voteData.note ?? null,
          updated_by: session.userId,
        };
      });

      await supabase.from("schedule_votes").upsert(voteRows, {
        onConflict: "schedule_date_id,user_id",
      });
    }

    return NextResponse.json({ data: application });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/apply] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
