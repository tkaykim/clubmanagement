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

  let payouts: Array<{
    id: string; amount: number; status: string; scheduled_at: string | null;
    paid_at: string | null; note: string | null;
    crew_members: { id: string; name: string; stage_name: string | null } | null;
    projects: { id: string; title: string } | null;
  }> = [];

  try {
    const { data } = await supabase
      .from("payouts")
      .select("id, amount, status, scheduled_at, paid_at, note, crew_members:user_id(id, name, stage_name), projects:project_id(id, title)")
      .order("created_at", { ascending: false });
    payouts = (data ?? []) as unknown as typeof payouts;
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
          <Link
            href={`/api/settlements/csv?month=${currentMonth}`}
            className="btn"
          >
            <Download size={14} strokeWidth={2} />
            CSV 다운로드
          </Link>
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
