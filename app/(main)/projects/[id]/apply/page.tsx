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

  if (project.status !== "recruiting") {
    redirect(`/projects/${projectId}`);
  }

  // 이미 지원했는지 확인 — 있으면 수정 모드로 진입
  const { data: existing } = await supabase
    .from("project_applications")
    .select("id, status, motivation, fee_agreement, answers_note")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 확정된 지원은 수정 불가 — 프로젝트 페이지로 리다이렉트
  if (existing && existing.status === "approved") {
    redirect(`/projects/${projectId}`);
  }

  const isEdit = !!existing;

  // schedule_dates 조회
  const { data: scheduleDates } = await supabase
    .from("schedule_dates")
    .select("id, date, label, kind, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  // 기존 votes prefetch (수정 모드만)
  let initialVotes: VotesMap | undefined;
  if (isEdit && scheduleDates && scheduleDates.length > 0) {
    const dateIds = scheduleDates.map((d) => d.id);
    const { data: prevVotes } = await supabase
      .from("schedule_votes")
      .select("schedule_date_id, status, time_slots, note")
      .eq("user_id", user.id)
      .in("schedule_date_id", dateIds);

    const map: VotesMap = {};
    for (const d of scheduleDates) {
      map[d.id] = { status: "available", time_slots: [], note: "" };
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
            {project.title} {isEdit ? "지원 수정" : "지원"}
          </h1>
          <div className="sub">
            {isEdit
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
            mode={isEdit ? "edit" : "create"}
            initialApplication={initialApplication}
            initialVotes={initialVotes}
          />
        </div>
      </div>
    </div>
  );
}
