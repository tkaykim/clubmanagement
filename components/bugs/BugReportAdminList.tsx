"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Bug, Loader2, Trash2, Copy, ExternalLink } from "lucide-react";
import type { BugReport, BugStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: BugStatus; label: string }[] = [
  { value: "open", label: "접수" },
  { value: "in_progress", label: "처리중" },
  { value: "resolved", label: "해결" },
  { value: "wontfix", label: "보류" },
  { value: "duplicate", label: "중복" },
];

const STATUS_LABEL: Record<BugStatus, string> = {
  open: "접수",
  in_progress: "처리중",
  resolved: "해결",
  wontfix: "보류",
  duplicate: "중복",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "가벼움",
  medium: "보통",
  high: "심각",
  blocker: "막힘",
};

const SEVERITY_RANK: Record<string, number> = {
  blocker: 3,
  high: 2,
  medium: 1,
  low: 0,
};

interface Props {
  bugs: BugReport[];
}

export function BugReportAdminList({ bugs: initialBugs }: Props) {
  const router = useRouter();
  const [bugs, setBugs] = useState<BugReport[]>(initialBugs);
  const [filter, setFilter] = useState<"all" | BugStatus>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const list = filter === "all" ? bugs : bugs.filter((b) => b.status === filter);
    // 심각도 높은 순 → 최신 순
    return [...list].sort((a, b) => {
      const s = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
      if (s !== 0) return s;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [bugs, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bugs.length };
    for (const b of bugs) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [bugs]);

  const updateStatus = async (id: string, status: BugStatus) => {
    setLoading(id);
    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "상태 변경 실패");
        return;
      }
      setBugs((prev) => prev.map((b) => (b.id === id ? (json.data as BugReport) : b)));
      toast.success("상태가 변경되었습니다");
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(null);
    }
  };

  const saveNote = async (id: string) => {
    const note = notes[id];
    if (note === undefined) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: note }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "저장 실패");
        return;
      }
      setBugs((prev) => prev.map((b) => (b.id === id ? (json.data as BugReport) : b)));
      toast.success("메모가 저장되었습니다");
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(null);
    }
  };

  const deleteBug = async (id: string) => {
    if (!confirm("이 버그 리포트를 삭제할까요?")) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/bugs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "삭제 실패");
        return;
      }
      setBugs((prev) => prev.filter((b) => b.id !== id));
      toast.success("삭제되었습니다");
      router.refresh();
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(null);
    }
  };

  const copyForDev = (b: BugReport) => {
    const text = [
      `# ${b.title}`,
      ``,
      `- severity: ${b.severity}`,
      `- status: ${b.status}`,
      `- reporter: ${b.reporter_name ?? "—"} (${b.reporter_id ?? "—"})`,
      `- reported_at: ${b.created_at}`,
      `- page_url: ${b.page_url ?? "—"}`,
      `- viewport: ${b.viewport ?? "—"}`,
      `- user_agent: ${b.user_agent ?? "—"}`,
      ``,
      `## 설명`,
      b.description,
      ``,
      b.admin_note ? `## 관리자 메모\n${b.admin_note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("개발자용 포맷으로 복사됨"))
      .catch(() => toast.error("복사에 실패했습니다"));
  };

  return (
    <div>
      {/* 필터 탭 */}
      <div className="tabs mb-16" style={{ borderBottom: "1px solid var(--border)" }}>
        {[
          { key: "all" as const, label: "전체" },
          ...STATUS_OPTIONS.map((s) => ({ key: s.value, label: s.label })),
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={cn("tab", filter === t.key && "on")}
            onClick={() => setFilter(t.key)}
          >
            {t.label}{" "}
            <span className="count" style={{ marginLeft: 4 }}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Bug className="ico" strokeWidth={1.5} />
            <div>해당하는 버그 리포트가 없습니다</div>
          </div>
        </div>
      ) : (
        <div className="card flush">
          {filtered.map((b, i) => {
            const isOpen = expanded === b.id;
            const note = notes[b.id] ?? b.admin_note ?? "";
            return (
              <div
                key={b.id}
                style={{
                  borderBottom:
                    i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "block",
                    width: "100%",
                    padding: "16px 18px",
                  }}
                >
                  <div className="row gap-8" style={{ alignItems: "center" }}>
                    <span className={cn("badge", severityKind(b.severity))}>
                      {SEVERITY_LABEL[b.severity] ?? b.severity}
                    </span>
                    <span className={cn("badge", statusKind(b.status))}>
                      {STATUS_LABEL[b.status]}
                    </span>
                    <div
                      className="flex-1"
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >
                      {b.title}
                    </div>
                    <span className="mono text-xs muted">
                      {new Date(b.created_at).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className="row gap-8 mt-4"
                    style={{ fontSize: 12, color: "var(--mf)" }}
                  >
                    <span>{b.reporter_name ?? "—"}</span>
                    {b.page_url && (
                      <>
                        <span>·</span>
                        <span
                          className="mono"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 300,
                          }}
                        >
                          {b.page_url}
                        </span>
                      </>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 18px 18px",
                      borderTop: "1px dashed var(--border)",
                    }}
                  >
                    {/* 상세 설명 */}
                    <div style={{ marginTop: 14 }}>
                      <div
                        className="mono text-xs muted"
                        style={{ letterSpacing: "0.08em", marginBottom: 6 }}
                      >
                        설명
                      </div>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          background: "var(--bg-soft)",
                          padding: 12,
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                        }}
                      >
                        {b.description}
                      </div>
                    </div>

                    {/* 기술 컨텍스트 */}
                    <div style={{ marginTop: 14 }}>
                      <div
                        className="mono text-xs muted"
                        style={{ letterSpacing: "0.08em", marginBottom: 6 }}
                      >
                        기술 정보
                      </div>
                      <dl
                        className="kv"
                        style={{ fontSize: 12, gap: "4px 12px" }}
                      >
                        <dt>페이지</dt>
                        <dd className="mono" style={{ wordBreak: "break-all" }}>
                          {b.page_url ? (
                            <a
                              href={b.page_url}
                              target="_blank"
                              rel="noreferrer"
                              className="row gap-4"
                              style={{ alignItems: "center", color: "inherit" }}
                            >
                              {b.page_url}
                              <ExternalLink size={10} strokeWidth={2} />
                            </a>
                          ) : (
                            "—"
                          )}
                        </dd>
                        <dt>뷰포트</dt>
                        <dd className="mono">{b.viewport ?? "—"}</dd>
                        <dt>UA</dt>
                        <dd
                          className="mono"
                          style={{
                            wordBreak: "break-all",
                            fontSize: 11,
                          }}
                        >
                          {b.user_agent ?? "—"}
                        </dd>
                        <dt>리포터</dt>
                        <dd>
                          {b.reporter_name ?? "—"}{" "}
                          <span className="mono muted text-xs">
                            {b.reporter_id ?? ""}
                          </span>
                        </dd>
                      </dl>
                    </div>

                    {/* 관리자 메모 */}
                    <div style={{ marginTop: 14 }}>
                      <div
                        className="mono text-xs muted"
                        style={{ letterSpacing: "0.08em", marginBottom: 6 }}
                      >
                        관리자 메모
                      </div>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={note}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [b.id]: e.target.value,
                          }))
                        }
                        placeholder="내부 메모 (리포터에게 공개되지 않습니다)"
                      />
                      <button
                        type="button"
                        className="btn sm mt-8"
                        onClick={() => saveNote(b.id)}
                        disabled={loading === b.id}
                      >
                        {loading === b.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        메모 저장
                      </button>
                    </div>

                    {/* 액션 */}
                    <div
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        marginTop: 16,
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div className="row gap-6">
                        <label className="mono text-xs muted">상태</label>
                        <select
                          className="select"
                          value={b.status}
                          onChange={(e) =>
                            updateStatus(b.id, e.target.value as BugStatus)
                          }
                          disabled={loading === b.id}
                          style={{ height: 30, fontSize: 12 }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="row gap-6">
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => copyForDev(b)}
                        >
                          <Copy size={12} strokeWidth={2} />
                          개발자용 복사
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => deleteBug(b.id)}
                          disabled={loading === b.id}
                          style={{ color: "var(--danger, #b91c1c)" }}
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function severityKind(s: string): string {
  switch (s) {
    case "blocker":
      return "danger";
    case "high":
      return "warn";
    case "medium":
      return "info";
    case "low":
    default:
      return "outline";
  }
}

function statusKind(s: BugStatus): string {
  switch (s) {
    case "open":
      return "warn";
    case "in_progress":
      return "info";
    case "resolved":
      return "ok";
    case "wontfix":
      return "outline";
    case "duplicate":
      return "outline";
    default:
      return "";
  }
}
