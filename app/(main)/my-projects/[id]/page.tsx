import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProjectAccess } from "@/lib/auth";
import { ManageProjectClient } from "@/components/manage/ManageProjectClient";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

// 프로젝트 관리자 / 운영진 공용 — 운영진이 보는 /manage/projects/[id] 와 100% 동일한
// 관리 화면(ManageProjectClient)을 그대로 렌더한다. 관리자(매니저)는 readOnly 로
// 조작 컨트롤만 숨기고 지원자/가능일정 탭만 본다.
export default async function MyProjectManagePage({ params, searchParams }: Props) {
  const { id: projectId } = await params;
  const { tab = "applications" } = await searchParams;

  const access = await getProjectAccess(projectId);
  if (!access) notFound();
  const readOnly = access !== "admin";

  const supabase = createServerSupabaseClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error || !project) notFound();

  const { data: rawApps } = await supabase
    .from("project_applications")
    .select("id, status, created_at, updated_at, motivation, fee_agreement, score, memo, answers_note, user_id, guest_name")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const { data: rawPayouts } = await supabase
    .from("payouts")
    .select("id, amount, status, scheduled_at, paid_at, note, user_id")
    .eq("project_id", projectId);

  const crewUserIds = Array.from(
    new Set(
      [
        ...(rawApps ?? []).map((a: { user_id: string | null }) => a.user_id),
        ...(rawPayouts ?? []).map((p: { user_id: string | null }) => p.user_id),
      ].filter((v): v is string => !!v)
    )
  );
  type CrewLite = { id: string; name: string; stage_name: string | null; role: string; position: string | null };
  const crewMap = new Map<string, CrewLite>();
  if (crewUserIds.length > 0) {
    const { data: crews } = await supabase
      .from("crew_members")
      .select("id, user_id, name, stage_name, role, position")
      .in("user_id", crewUserIds);
    for (const c of (crews ?? []) as Array<CrewLite & { user_id: string }>) {
      crewMap.set(c.user_id, { id: c.id, name: c.name, stage_name: c.stage_name, role: c.role, position: c.position });
    }
  }

  type RawApp = {
    id: string; status: string; created_at: string; updated_at: string;
    motivation: string | null; fee_agreement: string; score: number | null;
    memo: string | null; answers_note: string | null;
    user_id: string | null; guest_name: string | null;
  };
  const applications = ((rawApps ?? []) as RawApp[]).map((a) => ({
    ...a,
    crew_members: a.user_id ? crewMap.get(a.user_id) ?? null : null,
  }));

  const { data: scheduleDates } = await supabase
    .from("schedule_dates")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");

  const scheduleDateIds = (scheduleDates ?? []).map((d: { id: string }) => d.id);
  const { data: votes } =
    scheduleDateIds.length > 0
      ? await supabase
          .from("schedule_votes")
          .select("schedule_date_id, user_id, status, time_slots, note")
          .in("schedule_date_id", scheduleDateIds)
      : { data: [] as Array<{
          schedule_date_id: string;
          user_id: string;
          status: string;
          time_slots: Array<{ start: string; end: string; kind?: "available" | "unavailable" }>;
          note: string | null;
        }> };

  type RawPayout = {
    id: string; amount: number; status: string;
    scheduled_at: string | null; paid_at: string | null;
    note: string | null; user_id: string | null;
  };
  const payouts = ((rawPayouts ?? []) as RawPayout[]).map((p) => {
    const cm = p.user_id ? crewMap.get(p.user_id) ?? null : null;
    return {
      ...p,
      crew_members: cm ? { id: cm.id, name: cm.name, stage_name: cm.stage_name } : null,
    };
  });

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href={readOnly ? "/my-projects" : "/manage"} className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          {readOnly ? "내 담당 프로젝트" : "관리"}
        </Link>
      </div>

      <div className="page-head">
        <div>
          <div className="row gap-8 mb-6">
            <StatusBadge status={project.status} />
            <StatusBadge status={project.type} />
          </div>
          <h1 style={{ fontSize: 24 }}>{project.title}</h1>
        </div>
      </div>

      <ManageProjectClient
        project={project}
        applications={(applications ?? []) as Array<{
          id: string; status: string; created_at: string; updated_at: string;
          motivation: string | null; fee_agreement: string; score: number | null;
          memo: string | null; answers_note: string | null;
          user_id: string | null; guest_name: string | null;
          crew_members: { id: string; name: string; stage_name: string | null; role: string; position: string | null } | null;
        }>}
        scheduleDates={(scheduleDates ?? []) as Array<{ id: string; date: string; label: string | null; kind: string; sort_order: number }>}
        votes={(votes ?? []) as Array<{
          schedule_date_id: string;
          user_id: string;
          status: string;
          time_slots: Array<{ start: string; end: string; kind?: "available" | "unavailable" }>;
          note: string | null;
        }>}
        payouts={(payouts ?? []) as Array<{ id: string; amount: number; status: string; scheduled_at: string | null; paid_at: string | null; note: string | null; crew_members: { id: string; name: string; stage_name: string | null } | null }>}
        announcements={(announcements ?? []) as Array<{ id: string; title: string; body: string; pinned: boolean; created_at: string }>}
        initialTab={tab}
        readOnly={readOnly}
      />
    </div>
  );
}
