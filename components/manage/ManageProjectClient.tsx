"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtKRW, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Check, X, Loader2, DollarSign, Download, Megaphone } from "lucide-react";

const TABS = [
  { key: "applications", label: "지원자" },
  { key: "availability", label: "가용성" },
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
  payouts: Payout[];
  announcements: Announcement[];
  initialTab: string;
}

export function ManageProjectClient({
  project,
  applications,
  scheduleDates,
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

  const pendingApps = applications.filter(a => a.status === "pending");
  const approvedApps = applications.filter(a => a.status === "approved");

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
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}>
                      아직 지원자가 없어요
                    </td>
                  </tr>
                ) : (
                  applications.map(a => {
                    const name = a.crew_members?.name ?? a.guest_name ?? "—";
                    return (
                      <tr key={a.id}>
                        <td className="checkbox-col" data-label="">
                          <button
                            className={cn("cbx", selected.includes(a.id) && "on")}
                            onClick={() => toggleSelect(a.id)}
                            role="checkbox"
                            aria-checked={selected.includes(a.id)}
                          />
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
                                onClick={() => handleStatus(a.id, "approved")}
                                disabled={loading === a.id}
                                title="확정"
                              >
                                {loading === a.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2} />}
                              </button>
                            )}
                            {a.status !== "rejected" && (
                              <button
                                className="btn sm danger"
                                onClick={() => handleStatus(a.id, "rejected")}
                                disabled={loading === a.id}
                                title="탈락"
                              >
                                <X size={11} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
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
          ) : (
            <div className="card flush" style={{ overflowX: "auto" }}>
              <div
                className="heatmap"
                style={{ gridTemplateColumns: `160px repeat(${scheduleDates.length}, 1fr)`, minWidth: 400, padding: 16 }}
              >
                <div className="heat-head" />
                {scheduleDates.map(d => (
                  <div key={d.id} className="heat-head" style={{ padding: "6px 4px", textAlign: "center", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    {d.date.slice(5)}
                  </div>
                ))}
                {approvedApps.map(a => {
                  const name = a.crew_members?.name ?? a.guest_name ?? "—";
                  return (
                    <>
                      <div key={`name-${a.id}`} className="heat-name" style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center" }}>
                        {name}
                      </div>
                      {scheduleDates.map(d => (
                        <div key={`${a.id}-${d.id}`} className="heat-cell" data-lvl="0">·</div>
                      ))}
                    </>
                  );
                })}
              </div>
            </div>
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
            <button className="btn sm">
              <Download size={12} strokeWidth={2} />
              CSV 내보내기
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
            <button className="btn primary sm">
              <Megaphone size={12} strokeWidth={2} />
              공지 작성
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
