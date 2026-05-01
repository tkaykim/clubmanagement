import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { getSession } from "@/lib/auth";
import { applySchema, updateApplySchema, type VoteSubmitInput } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyAdmins, notifyUsers } from "@/lib/notifications";

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

    // 프로젝트 제목 + owner_id (로그/알림용)
    const { data: projForLog } = await supabase
      .from("projects")
      .select("title, owner_id")
      .eq("id", projectId)
      .maybeSingle();

    await logActivity({
      actorUserId: session?.userId ?? null,
      actorName: session ? null : appData.guest_name ?? "게스트",
      action: "application.create",
      targetType: "application",
      targetId: application.id,
      targetLabel: projForLog?.title ?? null,
      meta: { projectId, isGuest: !session },
    });

    // 지원자 이름 (멤버명 또는 게스트명)
    let applicantName = appData.guest_name ?? "게스트";
    if (session) {
      const { data: cm } = await supabase
        .from("crew_members")
        .select("name, stage_name")
        .eq("user_id", session.userId)
        .maybeSingle();
      const cmRow = cm as { name: string; stage_name: string | null } | null;
      applicantName = cmRow?.stage_name ?? cmRow?.name ?? "멤버";
    }

    // P0 #3: admin/owner + 프로젝트 등록자에게 알림
    const projForNotify = projForLog as { title: string; owner_id: string | null } | null;
    const ownerId = projForNotify?.owner_id ?? null;
    const ntitle = projForNotify?.title ?? "프로젝트";
    await notifyAdmins({
      title: "새 지원자",
      body: `${applicantName}님이 [${ntitle}]에 지원했어요`,
      url: `/manage/projects/${projectId}/applicants`,
      tag: `apply-${application.id}`,
    });
    if (ownerId) {
      await notifyUsers([ownerId], {
        title: "내 프로젝트에 새 지원자",
        body: `${applicantName}님이 [${ntitle}]에 지원했어요`,
        url: `/manage/projects/${projectId}/applicants`,
        tag: `apply-owner-${application.id}`,
      });
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

    const { votes, submitted_at, motivation, fee_agreement, answers_note, answers } =
      parsed.data;
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

    const row: Record<string, unknown> = {};
    if (motivation !== undefined) row.motivation = motivation;
    if (fee_agreement !== undefined) row.fee_agreement = fee_agreement;
    if (answers_note !== undefined) row.answers_note = answers_note;
    if (answers !== undefined) row.answers = answers;
    if (submitted_at !== undefined) {
      row.created_at = new Date(submitted_at).toISOString();
    }

    let application;

    if (Object.keys(row).length > 0) {
      const { data, error } = await supabase
        .from("project_applications")
        .update(row)
        .eq("id", existing.id)
        .select()
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "지원 수정에 실패했습니다" },
          { status: 500 }
        );
      }
      application = data;
    } else {
      const { data, error } = await supabase
        .from("project_applications")
        .select("*")
        .eq("id", existing.id)
        .single();
      if (error || !data) {
        return NextResponse.json(
          { error: "지원 수정에 실패했습니다" },
          { status: 500 }
        );
      }
      application = data;
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

    const { data: projForLog } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .maybeSingle();

    await logActivity({
      actorUserId: session.userId,
      action: "application.update",
      targetType: "application",
      targetId: application.id,
      targetLabel: projForLog?.title ?? null,
      meta: { projectId },
    });

    return NextResponse.json({ data: application });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]/apply] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/apply — 지원 취소(본인, pending·rejected 만)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const supabase = createRouteSupabaseClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("project_applications")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "지원 내역이 없습니다" },
        { status: 404 }
      );
    }

    if (existing.status === "approved") {
      return NextResponse.json(
        { error: "확정된 지원은 취소할 수 없습니다" },
        { status: 400 }
      );
    }

    const { data: dateRows } = await supabase
      .from("schedule_dates")
      .select("id")
      .eq("project_id", projectId);
    const dateIds = (dateRows ?? []).map((r: { id: string }) => r.id);
    if (dateIds.length > 0) {
      await supabase
        .from("schedule_votes")
        .delete()
        .in("schedule_date_id", dateIds)
        .eq("user_id", session.userId);
    }

    const { error: delErr } = await supabase
      .from("project_applications")
      .delete()
      .eq("id", existing.id);

    if (delErr) {
      console.error("[DELETE /api/projects/[id]/apply] error:", delErr);
      return NextResponse.json(
        { error: "지원 취소에 실패했습니다" },
        { status: 500 }
      );
    }

    const { data: projForLog } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .maybeSingle();

    await logActivity({
      actorUserId: session.userId,
      action: "application.withdraw",
      targetType: "application",
      targetId: existing.id,
      targetLabel: projForLog?.title ?? null,
      meta: { projectId },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]/apply] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
