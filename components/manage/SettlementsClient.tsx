"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, Download, Save, X, Check, Users, List } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtKRW } from "@/lib/utils";

export type SettlementRow = {
  id: string;
  amount: number;
  status: string;
  scheduled_at: string | null;
  paid_at: string | null;
  note: string | null;
  member: { id: string; user_id: string | null; name: string; stage_name: string | null } | null;
  project: { id: string; title: string } | null;
};

type View = "list" | "members";

interface Props {
  rows: SettlementRow[];
  month: string; // YYYY-MM or "all"
}

const STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "scheduled", label: "예정" },
  { value: "paid", label: "지급완료" },
] as const;

function statusOrder(s: string): number {
  return s === "pending" ? 0 : s === "scheduled" ? 1 : s === "paid" ? 2 : -1;
}

export function SettlementsClient({ rows, month }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    status: string;
    scheduled_at: string;
    paid_at: string;
    note: string;
  }>({ status: "pending", scheduled_at: "", paid_at: "", note: "" });
  const [saving, setSaving] = useState(false);

  // 통계
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        if (r.status === "paid") acc.paid += r.amount;
        else if (r.status === "scheduled") acc.scheduled += r.amount;
        else acc.pending += r.amount;
        return acc;
      },
      { paid: 0, scheduled: 0, pending: 0 }
    );
  }, [rows]);

  // 멤버별 그룹
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        name: string;
        stage: string | null;
        count: number;
        total: number;
        paid: number;
        scheduled: number;
        pending: number;
      }
    >();
    for (const r of rows) {
      const userId = r.member?.user_id ?? `__anon_${r.id}`;
      const entry =
        map.get(userId) ??
        {
          userId,
          name: r.member?.name ?? "—",
          stage: r.member?.stage_name ?? null,
          count: 0,
          total: 0,
          paid: 0,
          scheduled: 0,
          pending: 0,
        };
      entry.count += 1;
      entry.total += r.amount;
      if (r.status === "paid") entry.paid += r.amount;
      else if (r.status === "scheduled") entry.scheduled += r.amount;
      else entry.pending += r.amount;
      map.set(userId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  function onMonthChange(value: string) {
    const url = value === "all" ? "/manage/settlements" : `/manage/settlements?month=${value}`;
    startTransition(() => router.replace(url));
  }

  function startEdit(r: SettlementRow) {
    setEditingId(r.id);
    setDraft({
      status: r.status,
      scheduled_at: r.scheduled_at ?? "",
      paid_at: r.paid_at ?? "",
      note: r.note ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string, original: SettlementRow) {
    setSaving(true);
    try {
      // 변경된 필드만 보내기
      const payload: Record<string, unknown> = {};
      if (draft.status !== original.status) {
        if (statusOrder(draft.status) < statusOrder(original.status)) {
          alert("상태를 이전 단계로 되돌릴 수 없습니다.");
          setSaving(false);
          return;
        }
        payload.status = draft.status;
      }
      const sched = draft.scheduled_at || null;
      if (sched !== original.scheduled_at) payload.scheduled_at = sched;
      const paid = draft.paid_at || null;
      if (paid !== original.paid_at) payload.paid_at = paid;
      const note = draft.note || null;
      if (note !== original.note) payload.note = note;

      if (Object.keys(payload).length === 0) {
        setEditingId(null);
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "저장에 실패했습니다");
        setSaving(false);
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function batchMarkPaid() {
    if (selected.size === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!confirm(`선택한 ${selected.size}건을 지급완료(${today}) 처리할까요?`)) return;

    setSaving(true);
    const targets = rows.filter((r) => selected.has(r.id) && r.status !== "paid");
    let success = 0;
    let failed = 0;
    for (const r of targets) {
      const res = await fetch(`/api/payouts/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paid_at: today }),
      });
      if (res.ok) success += 1;
      else failed += 1;
    }
    setSaving(false);
    setSelected(new Set());
    if (failed > 0) alert(`${success}건 처리, ${failed}건 실패`);
    router.refresh();
  }

  const monthLabel = month === "all" ? "전체 기간" : `${month}`;
  const csvHref =
    month === "all"
      ? `/api/settlements/csv?month=${new Date().toISOString().slice(0, 7)}`
      : `/api/settlements/csv?month=${month}`;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>정산 리포트</h1>
          <div className="sub">{monthLabel} 팀 정산 현황</div>
        </div>
        <div className="row gap-8" style={{ flexWrap: "wrap" }}>
          <select
            className="input sm"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={isPending}
            aria-label="월 선택"
          >
            <option value="all">전체</option>
            {monthOptions().map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="row gap-4" role="tablist" aria-label="보기 전환">
            <button
              className={`btn sm ${view === "list" ? "primary" : ""}`}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              <List size={14} strokeWidth={2} /> 내역
            </button>
            <button
              className={`btn sm ${view === "members" ? "primary" : ""}`}
              onClick={() => setView("members")}
              aria-pressed={view === "members"}
            >
              <Users size={14} strokeWidth={2} /> 멤버별
            </button>
          </div>
          <a href={csvHref} className="btn sm">
            <Download size={14} strokeWidth={2} /> CSV
          </a>
        </div>
      </div>

      {/* 통계 */}
      <div className="os-grid grid-3 mb-24">
        <div className="card stat">
          <div className="lab">총 지급</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>
            {fmtKRW(totals.paid)}
          </div>
          <div className="delta">원</div>
        </div>
        <div className="card stat">
          <div className="lab">예정</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>
            {fmtKRW(totals.scheduled)}
          </div>
          <div className="delta">원</div>
        </div>
        <div className="card stat">
          <div className="lab">대기중</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>
            {fmtKRW(totals.pending)}
          </div>
          <div className="delta">원</div>
        </div>
      </div>

      {/* 일괄 액션 바 */}
      {view === "list" && rows.length > 0 && (
        <div className="row gap-8 mb-12" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <span className="text-xs muted">
            {selected.size > 0 ? `${selected.size}건 선택됨` : `${rows.length}건`}
          </span>
          <button
            className="btn sm"
            onClick={batchMarkPaid}
            disabled={selected.size === 0 || saving}
          >
            <Check size={14} strokeWidth={2} /> 선택 지급완료
          </button>
        </div>
      )}

      {view === "members" ? (
        <div className="card flush">
          <div className="card-head">
            <h3>멤버별 합계</h3>
            <span className="hint">{grouped.length}명</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>멤버</th>
                <th>건수</th>
                <th>총액</th>
                <th>지급완료</th>
                <th>예정</th>
                <th>대기</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}>
                    <DollarSign size={24} strokeWidth={1.5} style={{ margin: "0 auto 10px", display: "block", color: "var(--mf-2)" }} />
                    데이터가 없어요
                  </td>
                </tr>
              ) : (
                grouped.map((g) => (
                  <tr key={g.userId}>
                    <td data-label="멤버">
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      {g.stage && <div className="mono text-xs muted">{g.stage}</div>}
                    </td>
                    <td data-label="건수" className="num tabnum">{g.count}</td>
                    <td data-label="총액" className="num tabnum" style={{ fontWeight: 700 }}>
                      ₩{fmtKRW(g.total)}
                    </td>
                    <td data-label="지급완료" className="num tabnum">₩{fmtKRW(g.paid)}</td>
                    <td data-label="예정" className="num tabnum">₩{fmtKRW(g.scheduled)}</td>
                    <td data-label="대기" className="num tabnum">₩{fmtKRW(g.pending)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card flush">
          <div className="card-head">
            <h3>정산 내역</h3>
            <span className="hint">{rows.length}건</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleSelectAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th>멤버</th>
                <th>프로젝트</th>
                <th>금액</th>
                <th>상태</th>
                <th>예정일</th>
                <th>지급일</th>
                <th>메모</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}>
                    <DollarSign size={24} strokeWidth={1.5} style={{ margin: "0 auto 10px", display: "block", color: "var(--mf-2)" }} />
                    정산 내역이 없어요
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const editing = editingId === r.id;
                  return (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          aria-label="선택"
                        />
                      </td>
                      <td data-label="멤버">
                        <div style={{ fontWeight: 600 }}>{r.member?.name ?? "—"}</div>
                        {r.member?.stage_name && (
                          <div className="mono text-xs muted">{r.member.stage_name}</div>
                        )}
                      </td>
                      <td data-label="프로젝트">
                        {r.project ? (
                          <Link
                            href={`/manage/projects/${r.project.id}?tab=settlement`}
                            style={{ color: "inherit", textDecoration: "none", fontWeight: 500 }}
                          >
                            {r.project.title}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="금액" className="num tabnum" style={{ fontWeight: 700 }}>
                        ₩{fmtKRW(r.amount)}
                      </td>
                      <td data-label="상태">
                        {editing ? (
                          <select
                            className="input sm"
                            value={draft.status}
                            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={r.status} />
                        )}
                      </td>
                      <td data-label="예정일" className="mono text-xs">
                        {editing ? (
                          <input
                            type="date"
                            className="input sm"
                            value={draft.scheduled_at}
                            onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
                          />
                        ) : (
                          r.scheduled_at ?? "—"
                        )}
                      </td>
                      <td data-label="지급일" className="mono text-xs">
                        {editing ? (
                          <input
                            type="date"
                            className="input sm"
                            value={draft.paid_at}
                            onChange={(e) => setDraft({ ...draft, paid_at: e.target.value })}
                          />
                        ) : (
                          r.paid_at ?? "—"
                        )}
                      </td>
                      <td data-label="메모" className="text-xs muted" style={{ maxWidth: 200 }}>
                        {editing ? (
                          <input
                            type="text"
                            className="input sm"
                            value={draft.note}
                            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                            maxLength={1000}
                            placeholder="메모"
                          />
                        ) : (
                          r.note ?? "—"
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <div className="row gap-4">
                            <button
                              className="btn sm primary"
                              onClick={() => saveEdit(r.id, r)}
                              disabled={saving}
                              aria-label="저장"
                            >
                              <Save size={12} strokeWidth={2} />
                            </button>
                            <button
                              className="btn sm"
                              onClick={cancelEdit}
                              disabled={saving}
                              aria-label="취소"
                            >
                              <X size={12} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <button className="btn sm" onClick={() => startEdit(r)}>
                            편집
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function monthOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
