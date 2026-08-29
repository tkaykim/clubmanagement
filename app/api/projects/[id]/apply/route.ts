import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRouteSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getSession } from "@/lib/auth";
import { applySchema, updateApplySchema, type VoteSubmitInput } from "@/lib/validators";
import { logActivity } from "@/lib/activity-log";
import { notifyAdmins, notifyUsers } from "@/lib/notifications";
import { getRecruitmentWindowState } from "@/lib/recruitment";

type Params = { params: Promise<{ id: string }> };

function getClientFingerprint(request: Request, projectId: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${projectId}|${ip}`).digest("hex");
}

async function votesBelongToProject(
  supabase: SupabaseClient,
  projectId: string,
  votes: VoteSubmitInput["votes"] | undefined
): Promise<boolean> {
  const ids = [...new Set(Object.keys(votes ?? {}))];
  if (ids.length === 0) return true;

  const { data, error } = await supabase
    .from("schedule_dates")
    .select("id")
    .eq("project_id", projectId)
    .in("id", ids);

  return !error && (data?.length ?? 0) === ids.length;
}

/**
 * POST /api/projects/[id]/apply — 지원 제출 (게스트 허용)
 * 지원 레코드 생성 + schedule_votes UPSERT를 하나의 DB 트랜잭션으로 처리한다.
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

    const { _hp, votes, ...appData } = parsed.data;
    if (_hp) {
      return NextResponse.json({ data: { applicationId: null } }, { status: 201 });
    }
    const supabase = createServiceSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "지원 서비스를 사용할 수 없습니다" },
        { status: 503 }
      );
    }

    // 인증 사용자는 프로젝트 RLS까지 통과해야 하며, 게스트는 공개 프로젝트만 지원할 수 있다.
    const projectReader = session ? createRouteSupabaseClient() : supabase;
    const { data: project } = await projectReader
      .from("projects")
      .select("id, status, visibility, max_participants, recruitment_start_at, recruitment_end_at")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (!session && project.visibility !== "public") {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const recruitmentState = getRecruitmentWindowState(project);
    if (recruitmentState !== "open") {
      const error =
        recruitmentState === "upcoming"
          ? "아직 모집이 시작되지 않았습니다"
          : recruitmentState === "closed"
            ? "모집이 마감되었습니다"
            : "현재 모집 중인 프로젝트가 아닙니다";
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    if (!(await votesBelongToProject(supabase, projectId, votes))) {
      return NextResponse.json(
        { error: "프로젝트에 속하지 않은 일정 응답이 포함돼 있습니다" },
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

    // 게스트 필드·남용 방지 검증
    if (!session && (!appData.guest_name?.trim() || !appData.guest_email?.trim())) {
      return NextResponse.json(
        { error: "게스트 지원 시 이름과 이메일이 필요합니다" },
        { status: 400 }
      );
    }

    const guestEmail = session ? null : appData.guest_email!.trim().toLowerCase();
    if (!session) {
      const { data: allowed, error: rateError } = await supabase.rpc(
        "consume_application_rate_limit",
        {
          p_project_id: projectId,
          p_fingerprint: getClientFingerprint(request, projectId),
          p_limit: 5,
          p_window_seconds: 600,
        }
      );
      if (rateError) {
        console.error("[POST /api/projects/[id]/apply] rate limit error:", rateError);
        return NextResponse.json(
          { error: "지원 서비스를 잠시 사용할 수 없습니다" },
          { status: 503 }
        );
      }
      if (!allowed) {
        return NextResponse.json(
          { error: "짧은 시간에 너무 많은 지원이 접수됐습니다. 잠시 후 다시 시도해주세요" },
          { status: 429, headers: { "Retry-After": "600" } }
        );
      }
    }

    // 비회원은 schedule_votes.user_id가 없으므로 응답을 지원서 JSON에 원자적으로 보존한다.
    const storedAnswers = session || Object.keys(votes ?? {}).length === 0
      ? appData.answers ?? {}
      : { ...(appData.answers ?? {}), _schedule_votes: votes };

    // 지원서와 인증 사용자의 일정 응답을 DB 트랜잭션 하나로 생성한다.
    const { data: applicationData, error: appError } = await supabase.rpc(
      "service_submit_project_application_v2",
      {
        p_application: {
        project_id: projectId,
        user_id: session?.userId ?? null,
        guest_name: session ? null : appData.guest_name!.trim(),
        guest_email: guestEmail,
        guest_phone: session ? null : (appData.guest_phone ?? null),
        motivation: appData.motivation ?? null,
        fee_agreement: appData.fee_agreement,
        answers_note: appData.answers_note ?? null,
        answers: storedAnswers,
        },
        p_votes: session ? votes ?? {} : {},
      }
    );

    if (appError || !applicationData) {
      console.error("[POST /api/projects/[id]/apply] application error:", appError);
      if (appError?.code === "23505") {
        return NextResponse.json(
          { error: "이미 이 프로젝트에 지원했습니다" },
          { status: 409 }
        );
      }
      if (appError?.code === "P0001") {
        return NextResponse.json(
          { error: "현재 모집 중인 프로젝트가 아닙니다" },
          { status: 400 }
        );
      }
      if (appError?.code === "P0002" || appError?.code === "42501") {
        return NextResponse.json(
          { error: "프로젝트를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      if (appError?.code === "22023") {
        return NextResponse.json(
          { error: "일정 응답이 올바르지 않습니다" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "지원 제출에 실패했습니다" },
        { status: 500 }
      );
    }

    const application = applicationData as { id: string } & Record<string, unknown>;

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
    const supabase = createServiceSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "지원 수정 서비스를 사용할 수 없습니다" },
        { status: 503 }
      );
    }

    if (!(await votesBelongToProject(supabase, projectId, votes))) {
      return NextResponse.json(
        { error: "프로젝트에 속하지 않은 일정 응답이 포함돼 있습니다" },
        { status: 400 }
      );
    }

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

    const row: Record<string, unknown> = {};
    if (motivation !== undefined) row.motivation = motivation;
    if (fee_agreement !== undefined) row.fee_agreement = fee_agreement;
    if (answers_note !== undefined) row.answers_note = answers_note;
    if (answers !== undefined) row.answers = answers;
    if (submitted_at !== undefined) {
      row.created_at = new Date(submitted_at).toISOString();
    }

    // approved 지원자는 지원 정보(application) 변경 금지 — 일정 투표만 허용
    if (existing.status === "approved" && Object.keys(row).length > 0) {
      return NextResponse.json(
        { error: "확정된 지원은 일정 투표만 수정할 수 있습니다" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase.rpc(
      "service_update_project_application",
      {
        p_application_id: existing.id,
        p_user_id: session.userId,
        p_updates: row,
        p_votes: votes ?? {},
      }
    );
    if (updateError) {
      console.error("[PATCH /api/projects/[id]/apply] atomic update error:", updateError);
      return NextResponse.json(
        { error: "지원 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    const { data: application, error: readError } = await supabase
      .from("project_applications")
      .select("*")
      .eq("id", existing.id)
      .single();
    if (readError || !application) {
      return NextResponse.json(
        { error: "지원 수정 결과를 불러오지 못했습니다" },
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

    const supabase = createServiceSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "지원 서비스를 사용할 수 없습니다" },
        { status: 503 }
      );
    }

    const { data: applicationId, error: cancelError } = await supabase.rpc(
      "service_cancel_project_application",
      {
        p_project_id: projectId,
        p_user_id: session.userId,
      }
    );

    if (cancelError || !applicationId) {
      if (cancelError?.code === "P0002") {
        return NextResponse.json(
          { error: "지원 내역이 없습니다" },
          { status: 404 }
        );
      }
      if (cancelError?.code === "P0001") {
        return NextResponse.json(
          { error: "확정된 지원은 취소할 수 없습니다" },
          { status: 400 }
        );
      }
      console.error("[DELETE /api/projects/[id]/apply] error:", cancelError);
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
      targetId: applicationId,
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
