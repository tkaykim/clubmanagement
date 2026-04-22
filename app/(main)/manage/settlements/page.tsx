import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtKRW } from "@/lib/utils";
import { DollarSign, Download } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ month?: string }> };

export default async function SettlementsPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const currentMonth = month ?? new Date().toISOString().slice(0, 7);
  const supabase = createServerSupabaseClient();

  type Payout = {
    id: string; amount: number; status: string; scheduled_at: string | null;
    paid_at: string | null; note: string | null;
    crew_members: { id: string; name: string; stage_name: string | null } | null;
    projects: { id: string; title: string } | null;
  };
  let payouts: Payout[] = [];

  try {
    // NOTE: payouts.user_id 는 users(id) FK — crew_members 로의 FK 가 없으므로
    // PostgREST nested embed (`crew_members:user_id(...)`)는 자동 관계 감지에 실패한다.
    // → 따로 조회해서 user_id 로 매칭한다. (동일 이슈: /manage/projects/[id]/page.tsx)
    const { data: rawPayouts } = await supabase
      .from("payouts")
      .select("id, amount, status, scheduled_at, paid_at, note, user_id, project_id")
      .order("created_at", { ascending: false });

    type RawPayout = {
      id: string; amount: number; status: string; scheduled_at: string | null;
      paid_at: string | null; note: string | null;
      user_id: string | null; project_id: string | null;
    };
    const rows = (rawPayouts ?? []) as RawPayout[];

    const userIds = Array.from(
      new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))
    );
    const projectIds = Array.from(
      new Set(rows.map((r) => r.project_id).filter((v): v is string => !!v))
    );

    const crewMap = new Map<string, { id: string; name: string; stage_name: string | null }>();
    if (userIds.length > 0) {
      const { data: crews } = await supabase
        .from("crew_members")
        .select("id, user_id, name, stage_name")
        .in("user_id", userIds);
      for (const c of (crews ?? []) as Array<{ id: string; user_id: string; name: string; stage_name: string | null }>) {
        crewMap.set(c.user_id, { id: c.id, name: c.name, stage_name: c.stage_name });
      }
    }

    const projectMap = new Map<string, { id: string; title: string }>();
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", projectIds);
      for (const p of (projects ?? []) as Array<{ id: string; title: string }>) {
        projectMap.set(p.id, p);
      }
    }

    payouts = rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      scheduled_at: r.scheduled_at,
      paid_at: r.paid_at,
      note: r.note,
      crew_members: r.user_id ? crewMap.get(r.user_id) ?? null : null,
      projects: r.project_id ? projectMap.get(r.project_id) ?? null : null,
    }));
  } catch {
    // 빈 상태
  }

  const totalPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalScheduled = payouts.filter(p => p.status === "scheduled").reduce((s, p) => s + p.amount, 0);
  const totalPending = payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>정산 리포트</h1>
          <div className="sub">{currentMonth} 팀 정산 현황</div>
        </div>
        <div className="row gap-8">
          {/* NOTE: next/link 는 RSC prefetch 로 `_rsc=...` 가 붙어 `month` 파라미터가
              누락된 요청이 날아가 400 이 발생한다. Route Handler 다운로드 링크는
              일반 <a> 태그로 사용한다. */}
          <a
            href={`/api/settlements/csv?month=${currentMonth}`}
            className="btn"
          >
            <Download size={14} strokeWidth={2} />
            CSV 다운로드
          </a>
        </div>
      </div>

      {/* 통계 */}
      <div className="os-grid grid-3 mb-24">
        <div className="card stat">
          <div className="lab">총 지급</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{fmtKRW(totalPaid)}</div>
          <div className="delta">원</div>
        </div>
        <div className="card stat">
          <div className="lab">예정</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{fmtKRW(totalScheduled)}</div>
          <div className="delta">원</div>
        </div>
        <div className="card stat">
          <div className="lab">대기중</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{fmtKRW(totalPending)}</div>
          <div className="delta">원</div>
        </div>
      </div>

      {/* 정산 테이블 */}
      <div className="card flush">
        <div className="card-head">
          <h3>정산 내역</h3>
          <span className="hint">{payouts.length}건</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>멤버</th>
              <th>프로젝트</th>
              <th>금액</th>
              <th>상태</th>
              <th>지급일</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}>
                  <DollarSign size={24} strokeWidth={1.5} style={{ margin: "0 auto 10px", display: "block", color: "var(--mf-2)" }} />
                  정산 내역이 없어요
                </td>
              </tr>
            ) : (
              payouts.map(p => (
                <tr key={p.id}>
                  <td data-label="멤버">
                    <div style={{ fontWeight: 600 }}>{p.crew_members?.name ?? "—"}</div>
                    {p.crew_members?.stage_name && (
                      <div className="mono text-xs muted">{p.crew_members.stage_name}</div>
                    )}
                  </td>
                  <td data-label="프로젝트">
                    {p.projects ? (
                      <Link href={`/manage/projects/${p.projects.id}?tab=settlement`} style={{ color: "inherit", textDecoration: "none", fontWeight: 500 }}>
                        {p.projects.title}
                      </Link>
                    ) : "—"}
                  </td>
                  <td data-label="금액" className="num tabnum" style={{ fontWeight: 700 }}>
                    ₩{fmtKRW(p.amount)}
                  </td>
                  <td data-label="상태"><StatusBadge status={p.status} /></td>
                  <td data-label="지급일" className="mono text-xs muted">
                    {p.paid_at ?? p.scheduled_at ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
