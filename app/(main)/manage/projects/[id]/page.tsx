import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ManageProjectClient } from "@/components/manage/ManageProjectClient";
import { ProjectManagersSection } from "@/components/manage/ProjectManagersSection";
import { ChevronLeft, FileText } from "lucide-react";
import { paperworkHandoffUrl } from "@/lib/paperwork-link";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ManageProjectPage({ params, searchParams }: Props) {
  const { id: projectId } = await params;
  const { tab = "applications" } = await searchParams;
  const supabase = createServerSupabaseClient();

  // ─────────────────────────────────────────────────────────
  // 접근 가드: 로그인 + owner/admin + 활성 멤버만 진입 허용
  // ─────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("crew_members")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActiveAdmin =
    me?.is_active === true && (me.role === "admin" || me.role === "owner");
  if (!isActiveAdmin) notFound();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  // NOTE: project_applications.user_id 는 users(id) FK 이고
  // crew_members 로의 FK 는 없으므로 PostgREST nested embed (`crew_members:user_id(...)`)
  // 는 관계 자동감지에 실패해 실제로는 applications/payouts 배열이 비거나 null 이 된다.
  // → 따로 조회해서 user_id 로 매칭한다.
  const { data: rawApps } = await supabase
    .from("project_applications")
    .select("id, status, created_at, updated_at, motivation, fee_agreement, score, memo, answers_note, answers, user_id, guest_name")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // 레거시 프로젝트 관리 화면에서는 금액을 읽지 않는다.
  // 재무 권한과 운영진 권한은 별개이며, 정산은 finance 전용 화면에서 조회한다.
  const crewUserIds = Array.from(
    new Set(
      (rawApps ?? [])
        .map((a: { user_id: string | null }) => a.user_id)
        .filter((v): v is string => !!v)
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
    memo: string | null; answers_note: string | null; answers: Record<string, unknown>;
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

  // 열지도용 schedule_votes (admin 은 votes_admin_select 정책으로 전체 조회 가능)
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

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="row mb-12" style={{ justifyContent: "space-between" }}>
        <Link href="/manage" className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          관리
        </Link>
        <div className="row gap-8">
          <a
            href={paperworkHandoffUrl(projectId)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn sm"
          >
            <FileText size={13} strokeWidth={2} />
            거래 서류 보내기
          </a>
          <ProjectManagersSection projectId={projectId} />
        </div>
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
          memo: string | null; answers_note: string | null; answers: Record<string, unknown>;
          user_id: string | null; guest_name: string | null;
          crew_members: { id: string; name: string; stage_name: string | null; role: string; position: string | null } | null;
        }>}
        scheduleDates={(scheduleDates ?? []) as Array<{
          id: string; date: string; label: string | null; kind: string; sort_order: number;
          is_confirmed: boolean; confirmed_at: string | null;
        }>}
        votes={(votes ?? []) as Array<{
          schedule_date_id: string;
          user_id: string;
          status: string;
          time_slots: Array<{ start: string; end: string; kind?: "available" | "unavailable" }>;
          note: string | null;
        }>}
        announcements={(announcements ?? []) as Array<{ id: string; title: string; body: string; pinned: boolean; created_at: string }>}
        initialTab={tab}
      />
    </div>
  );
}
