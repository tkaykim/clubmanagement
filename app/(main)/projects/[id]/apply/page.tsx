import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ApplyForm, type ApplyFormInitial } from "@/components/project/ApplyForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { TimeSlot, VotesMap } from "@/components/project/VoteScheduleEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ApplyPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, title, status, type, fee, recruitment_end_at, description")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  // 이미 지원했는지 확인 — 있으면 수정 모드로 진입
  const { data: existing } = await supabase
    .from("project_applications")
    .select("id, status, motivation, fee_agreement, answers_note, created_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 신규 지원은 모집 중일 때만. 기존 지원자는 일정 투표 수정 위해 항상 진입 가능.
  if (!existing && project.status !== "recruiting") {
    redirect(`/projects/${projectId}`);
  }

  // approved 지원자는 vote-only 모드 — 지원 정보는 잠금, 일정 투표만 수정 가능
  const isApproved = existing?.status === "approved";
  const isEdit = !!existing;
  const mode: "create" | "edit" | "vote-only" =
    !existing ? "create" : isApproved ? "vote-only" : "edit";

  // schedule_dates 조회
  const { data: scheduleDates } = await supabase
    .from("schedule_dates")
    .select("id, date, label, kind, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  // 기존 votes prefetch (수정 모드 + vote-only)
  let initialVotes: VotesMap | undefined;
  let initialUnvotedIds: string[] = [];
  if (isEdit && scheduleDates && scheduleDates.length > 0) {
    const dateIds = scheduleDates.map((d) => d.id);
    const { data: prevVotes } = await supabase
      .from("schedule_votes")
      .select("schedule_date_id, status, time_slots, note")
      .eq("user_id", user.id)
      .in("schedule_date_id", dateIds);

    const votedSet = new Set((prevVotes ?? []).map((v) => (v as { schedule_date_id: string }).schedule_date_id));

    const map: VotesMap = {};
    for (const d of scheduleDates) {
      // 기본값은 "available" — 단, 사용자가 명시적으로 투표하지 않은 날짜는 unvotedIds에 등록
      map[d.id] = { status: "available", time_slots: [], note: "" };
      if (!votedSet.has(d.id)) initialUnvotedIds.push(d.id);
    }
    for (const v of prevVotes ?? []) {
      const row = v as {
        schedule_date_id: string;
        status: "available" | "partial" | "adjustable" | "unavailable";
        time_slots: TimeSlot[] | null;
        note: string | null;
      };
      map[row.schedule_date_id] = {
        status: row.status,
        time_slots: Array.isArray(row.time_slots) ? row.time_slots : [],
        note: row.note ?? "",
      };
    }
    initialVotes = map;
  }

  const initialApplication: ApplyFormInitial | undefined = existing
    ? {
        motivation: existing.motivation ?? "",
        fee_agreement:
          existing.fee_agreement === "partial" ? "partial" : "yes",
        answers_note: existing.answers_note ?? "",
        submitted_at: existing.created_at ?? "",
      }
    : undefined;

  // 현재 멤버 정보 (이름 자동완성용)
  const { data: member } = await supabase
    .from("crew_members")
    .select("name, stage_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href={`/projects/${projectId}`} className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          프로젝트
        </Link>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 24 }}>
            {project.title}{" "}
            {mode === "vote-only"
              ? "일정 투표"
              : mode === "edit"
                ? "지원 수정"
                : "지원"}
          </h1>
          <div className="sub">
            {mode === "vote-only"
              ? "내 가능 일정을 검토하고 수정해 주세요"
              : mode === "edit"
                ? "변경할 내용을 수정한 뒤 저장해 주세요"
                : "아래 항목을 작성해 주세요"}
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ padding: 24 }}>
          <ApplyForm
            projectId={projectId}
            projectTitle={project.title}
            fee={project.fee}
            scheduleDates={(scheduleDates ?? []) as Array<{
              id: string; date: string; label: string | null;
              kind: string; sort_order: number;
            }>}
            defaultName={member?.name ?? ""}
            defaultPhone={member?.phone ?? ""}
            mode={mode}
            initialApplication={initialApplication}
            initialVotes={initialVotes}
            initialUnvotedIds={initialUnvotedIds}
          />
        </div>
      </div>
    </div>
  );
}
