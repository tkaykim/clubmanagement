import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Folder, Calendar, MapPin } from "lucide-react";
import { AvatarStack } from "@/components/ui/OsAvatar";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createServerSupabaseClient();

  type ProjectRow = {
    id: string; title: string; status: string; type: string;
    poster_url: string | null; start_date: string | null;
    fee: number; venue: string | null; max_participants: number | null;
  };

  // 1차: projects_with_range 뷰. 뷰 스키마 변동(pay_type 등) 으로 실패하면
  // 기본 projects 테이블 + schedule_dates 병렬 조회로 폴백한다.
  type Raw = Omit<ProjectRow, "start_date"> & { start_date?: string | null };
  let rows: Raw[] = [];

  const viewQuery = await supabase
    .from("projects_with_range")
    .select("id, title, status, type, poster_url, start_date, fee, venue, max_participants")
    .order("created_at", { ascending: false });

  if (viewQuery.error) {
    console.error("[projects] view query failed, falling back:", viewQuery.error);
    const [projRes, datesRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, status, type, poster_url, fee, venue, max_participants, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("schedule_dates")
        .select("project_id, date"),
    ]);
    if (projRes.error) {
      console.error("[projects] projects fallback also failed:", projRes.error);
    }
    const minDateByProject = new Map<string, string>();
    for (const d of (datesRes.data ?? []) as { project_id: string; date: string }[]) {
      const prev = minDateByProject.get(d.project_id);
      if (!prev || d.date < prev) minDateByProject.set(d.project_id, d.date);
    }
    rows = ((projRes.data ?? []) as Array<Omit<ProjectRow, "start_date"> & { created_at?: string }>).map((p) => ({
      ...p,
      start_date: minDateByProject.get(p.id) ?? null,
    }));
  } else {
    rows = (viewQuery.data ?? []) as Raw[];
  }

  const projects: ProjectRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    type: r.type,
    poster_url: r.poster_url,
    start_date: r.start_date ?? null,
    fee: r.fee,
    venue: r.venue,
    max_participants: r.max_participants,
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            <span className="serif-tag">All</span>
            프로젝트
          </h1>
          <div className="sub">진행중 · 모집중 · 완료 프로젝트</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Folder className="ico" strokeWidth={1.5} />
            <div>아직 프로젝트가 없어요</div>
          </div>
        </div>
      ) : (
        <div className="os-grid grid-3">
          {projects.map(p => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card flush"
              style={{ cursor: "pointer", textDecoration: "none", transition: "border-color 150ms" }}
            >
              {p.poster_url ? (
                <img
                  src={p.poster_url}
                  alt={p.title}
                  style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderBottom: "1px solid var(--border)" }}
                />
              ) : (
                <div className="poster thumb" style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)" }}>
                  NO POSTER
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div className="row gap-6 mb-8">
                  <StatusBadge status={p.type} />
                  <StatusBadge status={p.status} />
                  {p.fee > 0 && (
                    <span className="badge outline">₩ {p.fee.toLocaleString("ko-KR")}</span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3, marginBottom: 10 }}>
                  {p.title}
                </div>
                <dl className="kv" style={{ gap: "4px 12px" }}>
                  {p.start_date && (
                    <>
                      <dt><Calendar size={10} strokeWidth={2} /></dt>
                      <dd className="mono text-xs">{p.start_date}</dd>
                    </>
                  )}
                  {p.venue && (
                    <>
                      <dt><MapPin size={10} strokeWidth={2} /></dt>
                      <dd className="text-xs">{p.venue}</dd>
                    </>
                  )}
                </dl>
                <div className="divider" style={{ margin: "10px 0" }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <AvatarStack members={[]} max={5} />
                  <span className="btn sm">자세히</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
