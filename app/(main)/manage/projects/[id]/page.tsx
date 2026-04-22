import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ManageProjectClient } from "@/components/manage/ManageProjectClient";
import { ChevronLeft } from "lucide-react";
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

  const { data: applications } = await supabase
    .from("project_applications")
    .select("*, crew_members:user_id(id, name, stage_name, role, position)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

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
          time_slots: Array<{ start: string; end: string }>;
          note: string | null;
        }> };

  const { data: payouts } = await supabase
    .from("payouts")
    .select("*, crew_members:user_id(id, name, stage_name)")
    .eq("project_id", projectId);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href="/manage" className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          관리
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
          time_slots: Array<{ start: string; end: string }>;
          note: string | null;
        }>}
        payouts={(payouts ?? []) as Array<{ id: string; amount: number; status: string; scheduled_at: string | null; paid_at: string | null; note: string | null; crew_members: { id: string; name: string; stage_name: string | null } | null }>}
        announcements={(announcements ?? []) as Array<{ id: string; title: string; body: string; pinned: boolean; created_at: string }>}
        initialTab={tab}
      />
    </div>
  );
}
