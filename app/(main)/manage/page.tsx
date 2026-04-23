import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Folder, Plus, Users, DollarSign, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const supabase = createServerSupabaseClient();

  let projects: Array<{
    id: string; title: string; status: string; type: string;
    start_date: string | null; fee: number;
  }> = [];
  const appCounts: Record<string, number> = {};

  try {
    const { data } = await supabase
      .from("projects_with_range")
      .select("id, title, status, type, start_date, fee")
      .order("created_at", { ascending: false });
    projects = (data ?? []) as typeof projects;

    if (projects.length > 0) {
      const ids = projects.map(p => p.id);
      const { data: apps } = await supabase
        .from("project_applications")
        .select("project_id")
        .in("project_id", ids);
      for (const a of apps ?? []) {
        appCounts[a.project_id] = (appCounts[a.project_id] ?? 0) + 1;
      }
    }
  } catch {
    // 빈 상태
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>프로젝트 관리</h1>
          <div className="sub">관리자 워크벤치</div>
        </div>
        <div className="row gap-8">
          <Link href="/manage/members" className="btn">
            <Users size={14} strokeWidth={2} />
            멤버 관리
          </Link>
          <Link href="/manage/settlements" className="btn">
            <DollarSign size={14} strokeWidth={2} />
            정산 리포트
          </Link>
          <Link href="/manage/projects/new" className="btn primary">
            <Plus size={14} strokeWidth={2} />
            새 프로젝트
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Folder className="ico" strokeWidth={1.5} />
            <div>아직 프로젝트가 없어요</div>
            <Link href="/manage/projects/new" className="btn primary sm mt-12">
              <Plus size={12} strokeWidth={2} />
              새 프로젝트 만들기
            </Link>
          </div>
        </div>
      ) : (
        <div className="card flush">
          {projects.map((p, i) => (
            <div
              key={p.id}
              style={{
                padding: "16px 18px",
                borderBottom: i < projects.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div className="flex-1">
                <div className="row gap-8 mb-6">
                  <StatusBadge status={p.status} />
                  <StatusBadge status={p.type} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                {p.start_date && (
                  <div className="mono text-xs muted mt-4">{p.start_date}</div>
                )}
              </div>
              <div className="row gap-8">
                <Link href={`/manage/projects/${p.id}?tab=applications`} className="btn sm">
                  <Users size={12} strokeWidth={2} />
                  지원 {appCounts[p.id] ? `(${appCounts[p.id]})` : ""}
                </Link>
                <Link href={`/manage/projects/${p.id}`} className="btn sm">
                  관리
                  <ChevronRight size={12} strokeWidth={2} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
