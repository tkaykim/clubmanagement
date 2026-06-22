import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Users, CalendarDays, ChevronRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
};

function formatRange(start: string | null, end: string | null): string {
  if (!start) return "일정 미정";
  const s = new Date(start).toLocaleDateString("ko-KR");
  if (!end || end === start) return s;
  return `${s} ~ ${new Date(end).toLocaleDateString("ko-KR")}`;
}

export default async function MyProjectsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 내가 프로젝트 관리자로 지정된 프로젝트 (RLS: project_managers_self_select)
  const { data: pmRows } = await supabase
    .from("project_managers")
    .select("project_id")
    .eq("user_id", user.id);

  const projectIds = Array.from(
    new Set(((pmRows ?? []) as Array<{ project_id: string }>).map((r) => r.project_id))
  );

  let projects: ProjectRow[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from("projects_with_range")
      .select("id, title, status, type, start_date, end_date")
      .in("id", projectIds)
      .order("start_date", { ascending: false, nullsFirst: false });
    projects = (data ?? []) as ProjectRow[];
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="row gap-6" style={{ alignItems: "center" }}>
            <ShieldCheck size={20} strokeWidth={2} />
            내 담당 프로젝트
          </h1>
          <div className="sub">내가 관리자로 지정된 프로젝트의 지원자현황과 일정을 볼 수 있습니다 (읽기전용)</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty">지정된 담당 프로젝트가 없습니다</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((p) => (
            <div key={p.id} className="card" style={{ padding: 16 }}>
              <div className="row gap-8 mb-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge status={p.status} />
                <StatusBadge status={p.type} />
              </div>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>{p.title}</h2>
              <div className="sub row gap-4" style={{ alignItems: "center", marginBottom: 12 }}>
                <CalendarDays size={13} strokeWidth={2} />
                {formatRange(p.start_date, p.end_date)}
              </div>
              <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                <Link href={`/my-projects/${p.id}/applicants`} className="btn sm">
                  <Users size={14} strokeWidth={2} />
                  지원자현황
                  <ChevronRight size={14} strokeWidth={2} />
                </Link>
                <Link href={`/my-projects/${p.id}/schedule`} className="btn sm">
                  <CalendarDays size={14} strokeWidth={2} />
                  일정
                  <ChevronRight size={14} strokeWidth={2} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
