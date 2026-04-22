"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtKRW, initials } from "@/lib/utils";
import { cn, PAY_TYPE_OPTIONS, type PayType } from "@/lib/utils";
import { Check, X, Loader2, DollarSign, Download, Megaphone, ChevronDown, ChevronRight, Users } from "lucide-react";

const TABS = [
  { key: "applications", label: "지원자" },
  { key: "availability", label: "가능 일정" },
  { key: "settlement", label: "정산" },
  { key: "announcements", label: "공지" },
  { key: "settings", label: "설정" },
] as const;
type Tab = (typeof TABS)[number]["key"];

interface Project {
  id: string;
  title: string;
  status: string;
  type: string;
  visibility: string;
  pay_type: string;
  fee: number;
  description: string | null;
  venue: string | null;
  max_participants: number | null;
  recruitment_end_at: string | null;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "전체공개", hint: "활성 멤버 누구나" },
  { value: "admin", label: "운영진만", hint: "owner · admin" },
  { value: "private", label: "비공개", hint: "등록자와 owner만" },
] as const;

interface Application {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  motivation: string | null;
  fee_agreement: string;
  score: number | null;
  memo: string | null;
  answers_note: string | null;
  user_id: string | null;
  guest_name: string | null;
  crew_members: { id: string; name: string; stage_name: string | null; role: string; position: string | null } | null;
}

interface ScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
  sort_order: number;
}

interface ScheduleVoteRow {
  schedule_date_id: string;
  user_id: string;
  status: string;
  time_slots: Array<{ start: string; end: string; kind?: "available" | "unavailable" }>;
  note: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  scheduled_at: string | null;
  paid_at: string | null;
  note: string | null;
  crew_members: { id: string; name: string; stage_name: string | null } | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

interface ManageProjectClientProps {
  project: Project;
  applications: Application[];
  scheduleDates: ScheduleDate[];
  votes: ScheduleVoteRow[];
  payouts: Payout[];
  announcements: Announcement[];
  initialTab: string;
}

export function ManageProjectClient({
  project,
  applications,
  scheduleDates,
  votes,
  payouts,
  announcements,
  initialTab,
}: ManageProjectClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || "applications");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>(project.visibility ?? "public");
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [payType, setPayType] = useState<PayType>((project.pay_type ?? "free") as PayType);
  const [feeAmount, setFeeAmount] = useState<number>(project.fee ?? 0);
  const [savingPay, setSavingPay] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [aggView, setAggView] = useState<"heatmap" | "by-date">("by-date");

  const toggleExpanded = (appId: string) => {
    setExpandedApp((prev) => (prev === appId ? null : appId));
  };

  const handleVisibilityChange = async (next: string) => {
    if (next === visibility) return;
    const prev = visibility;
    setVisibility(next);
    setSavingVisibility(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setVisibility(prev);
        toast.error(json.error ?? "변경에 실패했습니다");
      } else {
        toast.success("열람권한이 변경되었습니다");
        router.refresh();
      }
    } catch {
      setVisibility(prev);
      toast.error("네트워크 오류");
    } finally {
      setSavingVisibility(false);
    }
  };

  const savePay = async (nextType: PayType, nextFee: number) => {
    setSavingPay(true);
    try {
      const body = {
        pay_type: nextType,
        fee: nextType === "pay" || nextType === "fee" ? nextFee || 0 : 0,
      };
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "변경에 실패했습니다");
        return false;
      }
      toast.success("비용 설정이 저장되었습니다");
      router.refresh();
      return true;
    } catch {
      toast.error("네트워크 오류");
      return false;
    } finally {
      setSavingPay(false);
    }
  };

  const handlePayTypeChange = async (next: PayType) => {
    if (next === payType) return;
    setPayType(next);
    const nextFee = next === "pay" || next === "fee" ? feeAmount : 0;
    if (next !== "pay" && next !== "fee") setFeeAmount(0);
    await savePay(next, nextFee);
  };

  const pendingApps = applications.filter(a => a.status === "pending");
  const approvedApps = applications.filter(a => a.status === "approved");

  // 열지도 매트릭스: user_id → schedule_date_id → vote
  const votesByUser = (() => {
    const m = new Map<string, Map<string, ScheduleVoteRow>>();
    for (const v of votes) {
      if (!m.has(v.user_id)) m.set(v.user_id, new Map());
      m.get(v.user_id)!.set(v.schedule_date_id, v);
    }
    return m;
  })();

  const availabilitySummary = scheduleDates.map(d => {
    const cnt = { available: 0, partial: 0, adjustable: 0, unavailable: 0, none: 0 };
    for (const a of approvedApps) {
      if (!a.user_id) { cnt.none++; continue; }
      const v = votesByUser.get(a.user_id)?.get(d.id);
      if (!v) cnt.none++;
      else if (v.status === "available") cnt.available++;
      else if (v.status === "partial") cnt.partial++;
      else if (v.status === "adjustable") cnt.adjustable++;
      else if (v.status === "unavailable") cnt.unavailable++;
    }
    return { ...d, cnt };
  });

  const handleStatus = async (appId: string, status: "approved" | "rejected") => {
    setLoading(appId);
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "처리에 실패했습니다");
      } else {
        toast.success(status === "approved" ? "확정되었습니다" : "탈락 처리되었습니다");
        router.refresh();
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(null);
    }
  };

  const handleBulkStatus = async (status: "approved" | "rejected") => {
    if (selected.length === 0) return;
    setLoading("bulk");
    try {
      const res = await fetch("/api/applications/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_ids: selected, status }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "처리에 실패했습니다");
      } else {
        toast.success(`${selected.length}명 ${status === "approved" ? "확정" : "탈락"} 처리되었습니다`);
        setSelected([]);
        router.refresh();
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(null);
    }
  };

  const handlePayoutStatus = async (payoutId: string, status: string) => {
    setLoading(payoutId);
    try {
      const res = await fetch(`/api/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "처리에 실패했습니다");
      } else {
        toast.success("정산 상태가 변경되었습니다");
        router.refresh();
      }
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === applications.length) {
      setSelected([]);
    } else {
      setSelected(applications.map(a => a.id));
    }
  };

  return (
    <div>
      {/* 탭 */}
      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={cn("tab", tab === t.key && "on")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "applications" && applications.length > 0 && (
              <span className="count">{applications.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* 지원자 탭 */}
      {tab === "applications" && (
        <div>
          <div className="row mb-12" style={{ justifyContent: "space-between" }}>
            <div className="mono text-xs muted">
              총 {applications.length}명 · 대기 {pendingApps.length} · 확정 {approvedApps.length}
            </div>
            {selected.length > 0 && (
              <div className="row gap-8">
                <span className="mono text-xs">{selected.length}명 선택됨</span>
                <button
                  className="btn sm primary"
                  onClick={() => handleBulkStatus("approved")}
                  disabled={loading === "bulk"}
                >
                  {loading === "bulk" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2} />}
                  일괄 확정
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => handleBulkStatus("rejected")}
                  disabled={loading === "bulk"}
                >
                  일괄 탈락
                </button>
              </div>
            )}
          </div>

          <div className="card flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <button
                      className={cn("cbx", selected.length === applications.length && applications.length > 0 && "on")}
                      onClick={toggleAll}
                      role="checkbox"
                      aria-checked={selected.length === applications.length && applications.length > 0}
                    />
                  </th>
                  <th style={{ width: 24 }} />
                  <th>이름</th>
                  <th>지원일</th>
                  <th>동의</th>
                  <th>점수</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}>
                      아직 지원자가 없어요
                    </td>
                  </tr>
                ) : (
                  applications.map(a => {
                    const name = a.crew_members?.name ?? a.guest_name ?? "—";
                    const isExpanded = expandedApp === a.id;
                    const userVotes = a.user_id ? votesByUser.get(a.user_id) : undefined;
                    return (
                      <Fragment key={a.id}>
                        <tr
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            // 체크박스 / 버튼 클릭 시에는 펼치지 않음
                            const target = e.target as HTMLElement;
                            if (target.closest("button")) return;
                            toggleExpanded(a.id);
                          }}
                        >
                          <td className="checkbox-col" data-label="">
                            <button
                              className={cn("cbx", selected.includes(a.id) && "on")}
                              onClick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}
                              role="checkbox"
                              aria-checked={selected.includes(a.id)}
                            />
                          </td>
                          <td data-label="" style={{ width: 24 }}>
                            <button
                              className="btn ghost sm"
                              onClick={(e) => { e.stopPropagation(); toggleExpanded(a.id); }}
                              aria-label={isExpanded ? "접기" : "펼치기"}
                              style={{ padding: 2 }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td data-label="이름">
                            <div className="row gap-10">
                              <div className="av sm">{initials(name)}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                                {a.crew_members?.stage_name && (
                                  <div className="mono text-xs muted">{a.crew_members.stage_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td data-label="지원일" className="mono text-xs muted">
                            {new Date(a.created_at).toLocaleDateString("ko-KR")}
                          </td>
                          <td data-label="동의">
                            <span className={cn("badge", a.fee_agreement === "yes" ? "ok" : "warn")}>
                              {a.fee_agreement === "yes" ? "동의" : "조율"}
                            </span>
                          </td>
                          <td data-label="점수" className="tabnum">
                            {a.score ?? "—"}
                          </td>
                          <td data-label="상태">
                            <StatusBadge status={a.status} />
                          </td>
                          <td data-label="액션">
                            <div className="row gap-6">
                              {a.status !== "approved" && (
                                <button
                                  className="btn sm primary"
                                  onClick={(e) => { e.stopPropagation(); handleStatus(a.id, "approved"); }}
                                  disabled={loading === a.id}
                                  title="확정"
                                >
                                  {loading === a.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2} />}
                                </button>
                              )}
                              {a.status !== "rejected" && (
                                <button
                                  className="btn sm danger"
                                  onClick={(e) => { e.stopPropagation(); handleStatus(a.id, "rejected"); }}
                                  disabled={loading === a.id}
                                  title="탈락"
                                >
                                  <X size={11} strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="applicant-detail-row">
                            <td colSpan={8} style={{ background: "var(--muted)", padding: 16 }}>
                              <ApplicantDetail
                                application={a}
                                scheduleDates={scheduleDates}
                                userVotes={userVotes}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 가용성 탭 */}
      {tab === "availability" && (
        <div>
          {scheduleDates.length === 0 ? (
            <div className="card">
              <div className="empty">
                일정 날짜가 등록되지 않았어요
              </div>
            </div>
          ) : approvedApps.length === 0 ? (
            <div className="card">
              <div className="empty">
                확정된 지원자가 없어요. 지원자 탭에서 승인한 뒤 확인할 수 있습니다.
              </div>
            </div>
          ) : (
            <>
              {/* 뷰 전환 */}
              <div className="row mb-12 gap-8" style={{ justifyContent: "flex-end" }}>
                <button
                  className={cn("btn sm", aggView === "by-date" && "primary")}
                  onClick={() => setAggView("by-date")}
                  title="날짜별 누가 언제 되는지 확인"
                >
                  <Users size={12} strokeWidth={2} />
                  날짜별 취합
                </button>
                <button
                  className={cn("btn sm", aggView === "heatmap" && "primary")}
                  onClick={() => setAggView("heatmap")}
                  title="멤버 × 날짜 열지도"
                >
                  열지도
                </button>
              </div>

              {aggView === "by-date" && (
                <AvailabilityByDate
                  scheduleDates={scheduleDates}
                  approvedApps={approvedApps}
                  votesByUser={votesByUser}
                />
              )}

              {aggView === "heatmap" && (
            <div className="card flush" style={{ overflowX: "auto" }}>
              {/* 범례 */}
              <div className="row gap-8" style={{ padding: "10px 16px 0", flexWrap: "wrap", fontSize: 11, color: "var(--mf)" }}>
                <LegendChip color="#22c55e" glyph="●" label="가능" />
                <LegendChip color="#84cc16" glyph="◐" label="부분가능" />
                <LegendChip color="#eab308" glyph="◇" label="조정가능" />
                <LegendChip color="#94a3b8" glyph="✕" label="불가" />
                <LegendChip color="#cbd5e1" glyph="·" label="미투표" />
              </div>
              <div
                className="heatmap"
                style={{ gridTemplateColumns: `160px repeat(${scheduleDates.length}, minmax(48px, 1fr))`, minWidth: 400, padding: 16 }}
              >
                <div className="heat-head" />
                {availabilitySummary.map(d => (
                  <div
                    key={d.id}
                    className="heat-head"
                    style={{ padding: "6px 4px", textAlign: "center", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    title={d.label ?? ""}
                  >
                    <div>{d.date.slice(5)}</div>
                    <div style={{ fontSize: 9, color: d.kind === "practice" ? "var(--mf)" : "var(--accent, #3b82f6)", fontWeight: 600 }}>
                      {d.kind === "practice" ? "연습" : "본행사"}
                    </div>
                    {d.label && (
                      <div style={{ fontSize: 9, color: "var(--mf)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {d.label}
                      </div>
                    )}
                  </div>
                ))}
                {approvedApps.map(a => {
                  const name = a.crew_members?.name ?? a.guest_name ?? "—";
                  const userVotes = a.user_id ? votesByUser.get(a.user_id) : undefined;
                  return (
                    <div key={`row-${a.id}`} style={{ display: "contents" }}>
                      <div
                        className="heat-name"
                        style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center" }}
                      >
                        {name}
                      </div>
                      {scheduleDates.map(d => {
                        const v = userVotes?.get(d.id);
                        const s = v?.status as
                          | "available" | "partial" | "adjustable" | "unavailable"
                          | undefined;
                        const glyph =
                          s === "available" ? "●" :
                          s === "partial" ? "◐" :
                          s === "adjustable" ? "◇" :
                          s === "unavailable" ? "✕" :
                          "·";
                        const color =
                          s === "available" ? "#22c55e" :
                          s === "partial" ? "#84cc16" :
                          s === "adjustable" ? "#eab308" :
                          s === "unavailable" ? "#94a3b8" :
                          "#cbd5e1";
                        const slots = (v?.time_slots ?? []).map(t => `${t.start}~${t.end}`).join(", ");
                        const tt = v
                          ? `${d.date}${d.label ? ` · ${d.label}` : ""}\n상태: ${glyph} ${labelOf(s)}${slots ? `\n시간: ${slots}` : ""}${v.note ? `\n메모: ${v.note}` : ""}`
                          : `${d.date}${d.label ? ` · ${d.label}` : ""}\n미투표`;
                        return (
                          <div
                            key={`${a.id}-${d.id}`}
                            className="heat-cell"
                            data-lvl={s ?? "none"}
                            title={tt}
                            style={{ color, textAlign: "center", fontWeight: 600 }}
                          >
                            {glyph}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 정산 탭 */}
      {tab === "settlement" && (
        <div>
          {/* 합계 */}
          <div className="os-grid grid-3 mb-16">
            <div className="card stat">
              <div className="lab">총 정산</div>
              <div className="num tabnum" style={{ fontSize: 24 }}>
                {fmtKRW(payouts.reduce((s, p) => s + p.amount, 0))}
              </div>
              <div className="delta">원</div>
            </div>
            <div className="card stat">
              <div className="lab">지급 완료</div>
              <div className="num tabnum" style={{ fontSize: 24 }}>
                {fmtKRW(payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0))}
              </div>
              <div className="delta">원</div>
            </div>
            <div className="card stat">
              <div className="lab">대기중</div>
              <div className="num tabnum" style={{ fontSize: 24 }}>
                {fmtKRW(payouts.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0))}
              </div>
              <div className="delta">원</div>
            </div>
          </div>

          <div className="row mb-12" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn sm"
              disabled
              title="준비 중 — 다음 업데이트에 제공됩니다"
              aria-disabled="true"
            >
              <Download size={12} strokeWidth={2} />
              CSV 내보내기 (준비 중)
            </button>
          </div>

          <div className="card flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>멤버</th>
                  <th>금액</th>
                  <th>상태</th>
                  <th>예정일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}>
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
                      <td data-label="금액" className="num">₩{fmtKRW(p.amount)}</td>
                      <td data-label="상태"><StatusBadge status={p.status} /></td>
                      <td data-label="예정일" className="mono text-xs muted">{p.scheduled_at ?? "—"}</td>
                      <td data-label="액션">
                        <div className="row gap-6">
                          {p.status === "pending" && (
                            <button
                              className="btn sm"
                              onClick={() => handlePayoutStatus(p.id, "scheduled")}
                              disabled={loading === p.id}
                            >
                              예정
                            </button>
                          )}
                          {p.status === "scheduled" && (
                            <button
                              className="btn sm primary"
                              onClick={() => handlePayoutStatus(p.id, "paid")}
                              disabled={loading === p.id}
                            >
                              <DollarSign size={12} strokeWidth={2} />
                              지급
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 공지 탭 */}
      {tab === "announcements" && (
        <div>
          <div className="row mb-12" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn sm"
              disabled
              title="준비 중 — 다음 업데이트에 제공됩니다"
              aria-disabled="true"
            >
              <Megaphone size={12} strokeWidth={2} />
              공지 작성 (준비 중)
            </button>
          </div>
          {announcements.length === 0 ? (
            <div className="card">
              <div className="empty">
                프로젝트 공지가 없어요
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {announcements.map(a => (
                <div key={a.id} className="card">
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <b style={{ fontSize: 14 }}>{a.title}</b>
                    <div className="mono text-xs muted">{new Date(a.created_at).toLocaleDateString("ko-KR")}</div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--mf)", lineHeight: 1.6 }}>{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 설정 탭 */}
      {tab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 8 }}>열람권한</h3>
              <div className="mono text-xs muted" style={{ marginBottom: 16, letterSpacing: "0.02em" }}>
                누가 이 프로젝트를 볼 수 있는지 결정합니다.
              </div>
              <div className="seg full" style={{ opacity: savingVisibility ? 0.6 : 1, pointerEvents: savingVisibility ? "none" : "auto" }}>
                {VISIBILITY_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    className={cn(visibility === v.value && "on")}
                    onClick={() => handleVisibilityChange(v.value)}
                    title={v.hint}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="hint" style={{ fontSize: 11.5, color: "var(--mf)", marginTop: 8 }}>
                {VISIBILITY_OPTIONS.find((v) => v.value === visibility)?.hint}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 8 }}>비용</h3>
              <div className="mono text-xs muted" style={{ marginBottom: 16, letterSpacing: "0.02em" }}>
                페이 · 참가비 · 무료 · 미정 중 선택하세요.
              </div>
              <div
                className="seg full"
                style={{ opacity: savingPay ? 0.6 : 1, pointerEvents: savingPay ? "none" : "auto" }}
              >
                {PAY_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(payType === opt.value && "on")}
                    onClick={() => handlePayTypeChange(opt.value)}
                    title={opt.hint}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="hint" style={{ fontSize: 11.5, color: "var(--mf)", marginTop: 8 }}>
                {PAY_TYPE_OPTIONS.find((o) => o.value === payType)?.hint}
              </div>

              {(payType === "pay" || payType === "fee") && (
                <div className="field" style={{ marginTop: 14 }}>
                  <label htmlFor="fee-amount">
                    {payType === "pay" ? "출연료 (원)" : "참가비 (원)"}{" "}
                    <span className="hint">미정이면 0 으로 두세요</span>
                  </label>
                  <div className="row gap-8">
                    <input
                      id="fee-amount"
                      className="input"
                      type="number"
                      min={0}
                      step={10000}
                      value={feeAmount || ""}
                      onChange={(e) => setFeeAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn sm primary"
                      disabled={savingPay}
                      onClick={() => savePay(payType, feeAmount)}
                    >
                      {savingPay ? "저장 중…" : "금액 저장"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 20 }}>위험 구역</h3>
            <div className="banner" style={{ background: "var(--danger-bg)", border: "1px solid #FCA5A5", color: "var(--danger)", marginBottom: 12 }}>
              <span style={{ fontSize: 13 }}>삭제한 프로젝트는 복구할 수 없습니다.</span>
            </div>
            <button
              className="btn danger"
              onClick={async () => {
                if (!confirm("정말 이 프로젝트를 삭제하시겠어요?")) return;
                const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
                const json = await res.json();
                if (json.error) {
                  toast.error(json.error);
                } else {
                  toast.success("삭제되었습니다");
                  router.push("/manage");
                }
              }}
            >
              프로젝트 삭제
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendChip({ color, glyph, label }: { color: string; glyph: string; label: string }) {
  return (
    <span className="row gap-4" style={{ alignItems: "center" }}>
      <span style={{ color, fontWeight: 700 }}>{glyph}</span>
      <span>{label}</span>
    </span>
  );
}

function labelOf(s: "available" | "partial" | "adjustable" | "unavailable" | undefined): string {
  switch (s) {
    case "available": return "가능";
    case "partial": return "부분가능";
    case "adjustable": return "조정가능";
    case "unavailable": return "불가";
    default: return "미투표";
  }
}

function statusColor(s: "available" | "partial" | "adjustable" | "unavailable" | undefined): string {
  switch (s) {
    case "available": return "#22c55e";
    case "partial": return "#84cc16";
    case "adjustable": return "#eab308";
    case "unavailable": return "#94a3b8";
    default: return "#cbd5e1";
  }
}

interface AvailabilityByDateProps {
  scheduleDates: ScheduleDate[];
  approvedApps: Application[];
  votesByUser: Map<string, Map<string, ScheduleVoteRow>>;
}

type MemberStat = {
  name: string;
  userId: string | null;
  status: "available" | "partial" | "adjustable" | "unavailable" | "none";
  timeSlots: Array<{ start: string; end: string; kind?: "available" | "unavailable" }>;
  note: string | null;
};

function groupByStatus(members: MemberStat[]) {
  const g: Record<MemberStat["status"], MemberStat[]> = {
    available: [],
    partial: [],
    adjustable: [],
    unavailable: [],
    none: [],
  };
  for (const m of members) g[m.status].push(m);
  return g;
}

// 부분가능 time_slots 기반 시간대 오버랩 분석 — 30분 단위 비트마스크
function analyzePartialOverlap(members: MemberStat[]) {
  // 06:00 ~ 24:00, 30분 단위 → 36 슬롯
  const startMin = 6 * 60;
  const slotSize = 30;
  const totalSlots = 36;
  const minutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const toBitmap = (slots: MemberStat["timeSlots"]) => {
    // 기본은 전체 가능(1). kind="unavailable" 구간만 0 으로, kind="available" 슬롯이 있으면 해당 구간만 1 나머지는 0
    const anyAvailable = slots.some((s) => (s.kind ?? "available") === "available");
    const bits = new Array<number>(totalSlots).fill(anyAvailable ? 0 : 1);
    for (const s of slots) {
      const kind = s.kind ?? "available";
      const from = Math.max(0, Math.floor((minutes(s.start) - startMin) / slotSize));
      const to = Math.min(totalSlots, Math.ceil((minutes(s.end) - startMin) / slotSize));
      for (let i = from; i < to; i++) {
        bits[i] = kind === "available" ? 1 : 0;
      }
    }
    return bits;
  };
  const ranges: Array<{ start: string; end: string; members: string[] }> = [];
  const partialMembers = members.filter((m) => m.status === "partial");
  if (partialMembers.length === 0) return ranges;

  const bitmaps = partialMembers.map((m) => ({ m, b: toBitmap(m.timeSlots) }));
  // 모든 partial 멤버가 동시에 가능한 구간만 추출
  let current: { from: number; members: string[] } | null = null;
  const idxToHHMM = (idx: number) => {
    const total = startMin + idx * slotSize;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  for (let i = 0; i < totalSlots; i++) {
    const memsAtSlot = bitmaps.filter((x) => x.b[i] === 1).map((x) => x.m.name);
    if (memsAtSlot.length === bitmaps.length && memsAtSlot.length > 0) {
      if (!current) current = { from: i, members: memsAtSlot };
    } else {
      if (current) {
        ranges.push({
          start: idxToHHMM(current.from),
          end: idxToHHMM(i),
          members: current.members,
        });
        current = null;
      }
    }
  }
  if (current) {
    ranges.push({
      start: idxToHHMM(current.from),
      end: idxToHHMM(totalSlots),
      members: current.members,
    });
  }
  return ranges;
}

function AvailabilityByDate({ scheduleDates, approvedApps, votesByUser }: AvailabilityByDateProps) {
  const perDate = useMemo(() => {
    return scheduleDates.map((d) => {
      const members: MemberStat[] = approvedApps.map((a) => {
        const v = a.user_id ? votesByUser.get(a.user_id)?.get(d.id) : undefined;
        const s = (v?.status ?? "none") as MemberStat["status"];
        return {
          name: a.crew_members?.name ?? a.guest_name ?? "—",
          userId: a.user_id,
          status: v ? s : "none",
          timeSlots: v?.time_slots ?? [],
          note: v?.note ?? null,
        };
      });
      const grouped = groupByStatus(members);
      const overlap = analyzePartialOverlap(members);
      const score =
        grouped.available.length * 2 +
        grouped.partial.length +
        grouped.adjustable.length * 0.5 -
        grouped.unavailable.length;
      return { date: d, members, grouped, overlap, score };
    });
  }, [scheduleDates, approvedApps, votesByUser]);

  const maxScore = Math.max(0, ...perDate.map((x) => x.score));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="hint" style={{ fontSize: 11 }}>
        가능 {"×"}2 + 부분가능 {"×"}1 + 조정가능 {"×"}0.5 - 불가 로 점수를 계산해, 최적 일정 순으로 정렬됩니다.
      </div>
      {perDate
        .slice()
        .sort((a, b) => b.score - a.score)
        .map(({ date: d, grouped, overlap, score, members }) => {
          const total = members.length;
          const yesCount = grouped.available.length + grouped.partial.length + grouped.adjustable.length;
          const isBest = score === maxScore && total > 0;
          return (
            <div
              key={d.id}
              className="card"
              style={{
                padding: 16,
                borderLeft: isBest ? "3px solid var(--accent, #3b82f6)" : undefined,
              }}
            >
              <div className="row mb-12" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="row gap-8" style={{ alignItems: "center" }}>
                    <strong style={{ fontSize: 15 }}>{d.date}</strong>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: d.kind === "practice" ? "var(--muted)" : "var(--accent-soft, #f0f4ff)",
                        color: d.kind === "practice" ? "var(--mf)" : "var(--accent, #3b82f6)",
                        fontWeight: 600,
                      }}
                    >
                      {d.kind === "practice" ? "연습" : "본행사"}
                    </span>
                    {d.label && (
                      <span style={{ fontSize: 11, color: "var(--mf)", fontFamily: "var(--font-mono)" }}>
                        {d.label}
                      </span>
                    )}
                    {isBest && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--accent, #3b82f6)",
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      >
                        추천
                      </span>
                    )}
                  </div>
                  <div className="mono text-xs muted" style={{ marginTop: 4 }}>
                    참여 가능 {yesCount}/{total}명 · 점수 {score}
                  </div>
                </div>
              </div>

              {/* 상태별 멤버 목록 */}
              <div className="os-grid grid-2" style={{ gap: 8 }}>
                <MemberGroupBlock
                  title="가능"
                  color="#22c55e"
                  members={grouped.available}
                  emptyText="없음"
                />
                <MemberGroupBlock
                  title="부분가능"
                  color="#84cc16"
                  members={grouped.partial}
                  emptyText="없음"
                  showSlots
                />
                <MemberGroupBlock
                  title="조정가능"
                  color="#eab308"
                  members={grouped.adjustable}
                  emptyText="없음"
                  showNote
                />
                <MemberGroupBlock
                  title="불가"
                  color="#94a3b8"
                  members={grouped.unavailable}
                  emptyText="없음"
                />
              </div>

              {/* 미투표 */}
              {grouped.none.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--mf)" }}>
                  <strong>미투표:</strong> {grouped.none.map((m) => m.name).join(", ")}
                </div>
              )}

              {/* 부분가능 시간대 오버랩 */}
              {overlap.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "var(--accent-soft, #f0f4ff)",
                    fontSize: 12,
                  }}
                >
                  <div className="row gap-6" style={{ alignItems: "center", marginBottom: 4, color: "var(--accent, #3b82f6)", fontWeight: 600 }}>
                    <Users size={12} strokeWidth={2} />
                    <span>부분가능 멤버 전원이 겹치는 시간대</span>
                  </div>
                  {overlap.map((r, i) => (
                    <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {r.start} ~ {r.end}
                      {" · "}
                      <span style={{ color: "var(--mf)" }}>
                        {r.members.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

function MemberGroupBlock({
  title,
  color,
  members,
  emptyText,
  showSlots,
  showNote,
}: {
  title: string;
  color: string;
  members: MemberStat[];
  emptyText: string;
  showSlots?: boolean;
  showNote?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 10px",
        background: "var(--bg)",
      }}
    >
      <div className="row mb-6" style={{ alignItems: "center", gap: 6 }}>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>●</span>
        <strong style={{ fontSize: 12 }}>{title}</strong>
        <span className="mono text-xs muted">· {members.length}명</span>
      </div>
      {members.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--mf)" }}>{emptyText}</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {members.map((m, i) => (
            <li key={`${m.userId ?? m.name}-${i}`} style={{ fontSize: 12 }}>
              <div style={{ fontWeight: 500 }}>{m.name}</div>
              {showSlots && m.timeSlots.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
                  {m.timeSlots.map((t, j) => {
                    const unavail = t.kind === "unavailable";
                    return (
                      <span
                        key={j}
                        style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          borderRadius: 3,
                          fontFamily: "var(--font-mono)",
                          background: unavail ? "var(--danger-soft, #fdecec)" : "transparent",
                          color: unavail ? "var(--danger, #c33)" : "var(--mf)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {unavail ? "✕ " : ""}
                        {t.start}~{t.end}
                      </span>
                    );
                  })}
                </div>
              )}
              {showNote && m.note && (
                <div className="mono text-xs muted" style={{ marginTop: 2 }}>
                  · {m.note}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ApplicantDetailProps {
  application: Application;
  scheduleDates: ScheduleDate[];
  userVotes: Map<string, ScheduleVoteRow> | undefined;
}

function ApplicantDetail({ application: a, scheduleDates, userVotes }: ApplicantDetailProps) {
  const hasMotivation = !!(a.motivation && a.motivation.trim());
  const hasAnswers = !!(a.answers_note && a.answers_note.trim());
  const hasMemo = !!(a.memo && a.memo.trim());

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* 지원 내용 */}
      <div className="os-grid grid-2" style={{ gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="lab" style={{ fontSize: 11, marginBottom: 6 }}>지원 동기</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap", color: hasMotivation ? "inherit" : "var(--mf)" }}>
            {hasMotivation ? a.motivation : "— 작성 안 함 —"}
          </div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="lab" style={{ fontSize: 11, marginBottom: 6 }}>자기소개 · 기타</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap", color: hasAnswers ? "inherit" : "var(--mf)" }}>
            {hasAnswers ? a.answers_note : "— 작성 안 함 —"}
          </div>
        </div>
      </div>

      {hasMemo && (
        <div className="card" style={{ padding: 12 }}>
          <div className="lab" style={{ fontSize: 11, marginBottom: 6 }}>관리자 메모</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{a.memo}</div>
        </div>
      )}

      {/* 가용성 응답 */}
      <div className="card" style={{ padding: 12 }}>
        <div className="lab" style={{ fontSize: 11, marginBottom: 8 }}>
          가능 일정 응답 · {scheduleDates.length}건
        </div>
        {scheduleDates.length === 0 ? (
          <div className="empty" style={{ padding: 12 }}>등록된 일정이 없습니다</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {scheduleDates.map((d) => {
              const v = userVotes?.get(d.id);
              const s = v?.status as
                | "available" | "partial" | "adjustable" | "unavailable"
                | undefined;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 80px 1fr",
                    gap: 8,
                    alignItems: "start",
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: v ? "var(--bg)" : "transparent",
                    fontSize: 12,
                  }}
                >
                  <div className="mono" style={{ color: "var(--mf)" }}>
                    {d.date.slice(5)}
                    {d.label && <span> · {d.label}</span>}
                  </div>
                  <div style={{ color: statusColor(s), fontWeight: 600 }}>
                    {labelOf(s)}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                    {(v?.time_slots ?? []).length === 0 ? (
                      <span style={{ color: "var(--mf)" }}>—</span>
                    ) : (
                      (v?.time_slots ?? []).map((t, i) => {
                        const unavail = t.kind === "unavailable";
                        return (
                          <span
                            key={i}
                            style={{
                              padding: "1px 6px",
                              borderRadius: 3,
                              fontSize: 11,
                              fontFamily: "var(--font-mono)",
                              background: unavail ? "var(--danger-soft, #fdecec)" : "var(--accent-soft, #f0f4ff)",
                              color: unavail ? "var(--danger, #c33)" : "var(--accent, #3b82f6)",
                              border: `1px solid ${unavail ? "var(--danger, #c33)" : "var(--accent, #3b82f6)"}`,
                            }}
                            title={unavail ? "이 시간은 불가" : "이 시간 가능"}
                          >
                            {unavail ? "✕ " : ""}
                            {t.start}~{t.end}
                          </span>
                        );
                      })
                    )}
                    {v?.note && (
                      <span style={{ color: "var(--mf)", fontSize: 11 }}>· {v.note}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
