import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Sparkles, Calendar, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtPay, payTypeChipTone } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RecruitingRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  poster_url: string | null;
  start_date: string | null;
  pay_type: string | null;
  fee: number;
  venue: string | null;
  recruitment_end_at: string | null;
};

export default async function ApplyEntryPage() {
  const supabase = createServerSupabaseClient();

  // 모집중 프로젝트 목록. projects_with_range 뷰에서 시작일 포함.
  let rows: RecruitingRow[] = [];
  const viewQuery = await supabase
    .from("projects_with_range")
    .select("id, title, status, type, poster_url, start_date, pay_type, fee, venue, recruitment_end_at")
    .eq("status", "recruiting")
    .order("recruitment_end_at", { ascending: true, nullsFirst: false });

  if (!viewQuery.error) {
    rows = (viewQuery.data ?? []) as RecruitingRow[];
  } else {
    const fallback = await supabase
      .from("projects")
      .select("id, title, status, type, poster_url, pay_type, fee, venue, recruitment_end_at, created_at")
      .eq("status", "recruiting")
      .order("created_at", { ascending: false });
    const list = (fallback.data ?? []) as Array<Omit<RecruitingRow, "start_date"> & { created_at?: string }>;
    rows = list.map((p) => ({ ...p, start_date: null }));
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            <span className="serif-tag">Open</span>
            모집중인 프로젝트
          </h1>
          <div className="sub">현재 지원 가능한 프로젝트 · {rows.length}건</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Sparkles className="ico" strokeWidth={1.5} />
            <div>지금 모집 중인 프로젝트가 없어요</div>
            <Link href="/projects" className="btn sm mt-12">
              전체 프로젝트 보기
            </Link>
          </div>
        </div>
      ) : (
        <div className="os-grid grid-3">
          {rows.map((p) => (
            <div key={p.id} className="card flush" style={{ overflow: "hidden" }}>
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
                  {p.recruitment_end_at && (
                    <>
                      <dt className="text-xs muted">마감</dt>
                      <dd className="mono text-xs">{p.recruitment_end_at.slice(0, 10)}</dd>
                    </>
                  )}
                </dl>
                <div className="divider" style={{ margin: "10px 0" }} />
                <div className="row" style={{ justifyContent: "space-between", gap: 6 }}>
                  <Link href={`/projects/${p.id}`} className="btn sm">
                    자세히
                  </Link>
                  <Link href={`/projects/${p.id}/apply`} className="btn sm primary">
                    지원하기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
