import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Folder, Calendar, MapPin } from "lucide-react";
import { AvatarStack } from "@/components/ui/OsAvatar";
import { fmtPay, payTypeChipTone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createServerSupabaseClient();

  type ProjectRow = {
    id: string; title: string; status: string; type: string;
    poster_url: string | null; start_date: string | null;
    pay_type: string | null; fee: number;
    venue: string | null; max_participants: number | null;
  };

  // 1차: projects_with_range 뷰 (pay_type 포함).
  // 2차: projects 테이블 (pay_type 포함).
  // 3차: projects 테이블 (pay_type 없이) — 007 마이그레이션 미적용 환경 대응.
  // 어느 단계든 성공하면 다음 단계 스킵.
  type Raw = Omit<ProjectRow, "start_date"> & { start_date?: string | null };
  let rows: Raw[] = [];

  const viewQuery = await supabase
    .from("projects_with_range")
    .select("id, title, status, type, poster_url, start_date, pay_type, fee, venue, max_participants")
    .order("created_at", { ascending: false });

  if (!viewQuery.error) {
    rows = (viewQuery.data ?? []) as Raw[];
  } else {
    console.error("[projects] view query failed, falling back to projects table:", viewQuery.error);

    // 2차: projects + schedule_dates 병렬 (pay_type 포함)
    const [projResA, datesRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, status, type, poster_url, pay_type, fee, venue, max_participants, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("schedule_dates")
        .select("project_id, date"),
    ]);

    type ProjRow = Omit<ProjectRow, "start_date"> & { created_at?: string };
    let projData: ProjRow[] = (projResA.data ?? []) as ProjRow[];

    // 3차: pay_type 컬럼이 없는 환경에서는 재시도 (pay_type 없이)
    if (projResA.error) {
      console.error("[projects] fallback with pay_type failed, retrying without pay_type:", projResA.error);
      const retry = await supabase
        .from("projects")
        .select("id, title, status, type, poster_url, fee, venue, max_participants, created_at")
        .order("created_at", { ascending: false });
      if (retry.error) {
        console.error("[projects] final fallback failed:", retry.error);
        projData = [];
      } else {
        const data = (retry.data ?? []) as Array<Omit<ProjRow, "pay_type">>;
        projData = data.map(p => ({ ...p, pay_type: null }));
      }
    }

    const minDateByProject = new Map<string, string>();
    for (const d of (datesRes.data ?? []) as { project_id: string; date: string }[]) {
      const prev = minDateByProject.get(d.project_id);
      if (!prev || d.date < prev) minDateByProject.set(d.project_id, d.date);
    }
    rows = projData.map((p) => ({
      ...p,
      start_date: minDateByProject.get(p.id) ?? null,
    }));
  }

  const projects: ProjectRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    type: r.type,
    poster_url: r.poster_url,
    start_date: r.start_date ?? null,
    pay_type: r.pay_type ?? null,
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
                  <span className={`badge ${payTypeChipTone(p.pay_type)}`}>
                    {fmtPay(p.pay_type, p.fee)}
                  </span>
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
