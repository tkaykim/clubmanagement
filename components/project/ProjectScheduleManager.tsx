"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Kind = "event" | "practice";

export type ScheduleDateRow = {
  id: string;
  project_id: string;
  date: string;
  label: string | null;
  kind: Kind;
  sort_order: number;
};

interface Props {
  projectId: string;
  initialDates?: ScheduleDateRow[];
}

const MAX_RANGE_DAYS = 90;

function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return out;
  const cursor = new Date(s);
  while (cursor <= e) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function ProjectScheduleManager({ projectId, initialDates }: Props) {
  const [rows, setRows] = useState<ScheduleDateRow[]>(initialDates ?? []);
  const [loading, setLoading] = useState(!initialDates);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"single" | "range">("single");

  // 단일 추가
  const [newDate, setNewDate] = useState("");
  const [newKind, setNewKind] = useState<Kind>("event");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  // 범위 추가
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeKind, setRangeKind] = useState<Kind>("event");
  const [rangeLabel, setRangeLabel] = useState("");
  const [addingRange, setAddingRange] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-dates`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "일정 조회 실패");
        return;
      }
      setRows(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!initialDates) void reload();
  }, [initialDates, reload]);

  async function addSingle() {
    if (!newDate) {
      toast.error("날짜를 선택해주세요");
      return;
    }
    if (rows.some((r) => r.date === newDate && r.kind === newKind)) {
      toast.error("이미 추가된 날짜입니다");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          label: newLabel.trim() || null,
          kind: newKind,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "일정 추가 실패");
        return;
      }
      setRows((prev) => [...prev, json.data].sort(sortRows));
      setNewDate("");
      setNewLabel("");
      toast.success("일정이 추가됐어요");
    } finally {
      setAdding(false);
    }
  }

  async function addRange() {
    if (!rangeStart || !rangeEnd) {
      toast.error("시작일과 종료일을 모두 선택하세요");
      return;
    }
    if (rangeStart > rangeEnd) {
      toast.error("시작일이 종료일보다 늦을 수 없습니다");
      return;
    }
    const all = enumerateDates(rangeStart, rangeEnd);
    if (all.length === 0) {
      toast.error("유효하지 않은 범위입니다");
      return;
    }
    if (all.length > MAX_RANGE_DAYS) {
      toast.error(`범위가 너무 큽니다 (최대 ${MAX_RANGE_DAYS}일)`);
      return;
    }
    const existing = new Set(rows.filter((r) => r.kind === rangeKind).map((r) => r.date));
    const toAdd = all.filter((d) => !existing.has(d));
    if (toAdd.length === 0) {
      toast.error("해당 범위의 날짜가 모두 이미 추가돼 있습니다");
      return;
    }
    setAddingRange(true);
    try {
      const inserted: ScheduleDateRow[] = [];
      for (const date of toAdd) {
        const res = await fetch(`/api/projects/${projectId}/schedule-dates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            label: rangeLabel.trim() || null,
            kind: rangeKind,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(`${date} 추가 실패: ${json.error ?? ""}`);
          break;
        }
        inserted.push(json.data);
      }
      if (inserted.length > 0) {
        setRows((prev) => [...prev, ...inserted].sort(sortRows));
        const skipped = all.length - inserted.length;
        toast.success(
          `${inserted.length}개 추가됨` + (skipped > 0 ? ` (중복 ${skipped}개 건너뜀)` : "")
        );
        setRangeStart("");
        setRangeEnd("");
        setRangeLabel("");
      }
    } finally {
      setAddingRange(false);
    }
  }

  async function updateRow(id: string, patch: Partial<Pick<ScheduleDateRow, "date" | "label" | "kind">>) {
    const before = rows;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)).sort(sortRows));
    setSavingId(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-dates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        setRows(before);
        toast.error(json.error ?? "수정 실패");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? json.data : r)).sort(sortRows));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!confirm(`${row.date} (${row.kind === "event" ? "본행사" : "연습"}) 일정을 삭제할까요?\n이 일정에 대한 투표도 함께 삭제됩니다.`)) {
      return;
    }
    const before = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSavingId(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-dates/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setRows(before);
        toast.error(json.error ?? "삭제 실패");
        return;
      }
      toast.success("일정이 삭제됐어요");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>일정 후보 관리</h3>
        <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--mf)" }}>
          {rows.length}개
        </div>
      </div>
      <div style={{ padding: 18 }}>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--mf)",
            marginBottom: 14,
            padding: "8px 10px",
            background: "var(--surface-2, #f5f5f5)",
            borderRadius: 6,
          }}
        >
          변경 사항은 즉시 저장되고, 프로젝트 지원자(대기/승인 포함)에게 알림이 발송됩니다.
        </div>

        {/* 추가 모드 토글 */}
        <div className="seg full" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={addMode === "single" ? "on" : ""}
            onClick={() => setAddMode("single")}
          >
            <CalendarPlus size={13} strokeWidth={2} />
            <span style={{ marginLeft: 6 }}>단일 추가</span>
          </button>
          <button
            type="button"
            className={addMode === "range" ? "on" : ""}
            onClick={() => setAddMode("range")}
          >
            <CalendarPlus size={13} strokeWidth={2} />
            <span style={{ marginLeft: 6 }}>범위 추가</span>
          </button>
        </div>

        {addMode === "single" ? (
          <div className="field">
            <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
              <input
                className="input"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <select
                className="select"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as Kind)}
              >
                <option value="event">본행사</option>
                <option value="practice">연습</option>
              </select>
            </div>
            <input
              className="input"
              placeholder="라벨 (선택)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <button
              type="button"
              className="btn sm primary"
              onClick={addSingle}
              disabled={!newDate || adding}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2} />}
              날짜 추가
            </button>
          </div>
        ) : (
          <div className="field">
            <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
              <input
                className="input"
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                aria-label="시작일"
              />
              <input
                className="input"
                type="date"
                value={rangeEnd}
                min={rangeStart || undefined}
                onChange={(e) => setRangeEnd(e.target.value)}
                aria-label="종료일"
              />
            </div>
            <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
              <select
                className="select"
                value={rangeKind}
                onChange={(e) => setRangeKind(e.target.value as Kind)}
              >
                <option value="event">본행사</option>
                <option value="practice">연습</option>
              </select>
              <input
                className="input"
                placeholder="공통 라벨 (선택)"
                value={rangeLabel}
                onChange={(e) => setRangeLabel(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn sm primary"
              onClick={addRange}
              disabled={!rangeStart || !rangeEnd || addingRange}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {addingRange ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2} />}
              범위 전체 추가
            </button>
          </div>
        )}

        {/* 목록 */}
        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--mf)" }}>
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--mf)", textAlign: "center" }}>
              아직 추가된 일정이 없어요. 위에서 날짜 후보를 추가하면 지원자들이 투표할 수 있어요.
            </div>
          ) : (
            <div>
              <div
                className="mono text-xs muted"
                style={{
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                추가된 날짜 ({rows.length})
              </div>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="row"
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    gap: 8,
                  }}
                >
                  <input
                    className="input mono"
                    type="date"
                    value={r.date}
                    onChange={(e) => updateRow(r.id, { date: e.target.value })}
                    style={{ width: 140, height: 28, padding: "2px 6px", fontSize: 12 }}
                    disabled={savingId === r.id}
                  />
                  <select
                    className="select"
                    value={r.kind}
                    onChange={(e) => updateRow(r.id, { kind: e.target.value as Kind })}
                    style={{ maxWidth: 100, height: 28, padding: "2px 6px", fontSize: 12 }}
                    disabled={savingId === r.id}
                  >
                    <option value="event">본행사</option>
                    <option value="practice">연습</option>
                  </select>
                  <input
                    className="input"
                    placeholder="라벨"
                    value={r.label ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((row) => (row.id === r.id ? { ...row, label: e.target.value } : row))
                      )
                    }
                    onBlur={(e) => {
                      const next = e.target.value.trim() || null;
                      if (next !== (r.label ?? null)) {
                        void updateRow(r.id, { label: next });
                      }
                    }}
                    style={{ flex: 1, height: 28, padding: "2px 8px", fontSize: 12 }}
                    disabled={savingId === r.id}
                  />
                  {savingId === r.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <button
                      type="button"
                      className="btn ghost icon-only sm"
                      onClick={() => deleteRow(r.id)}
                      aria-label="삭제"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function sortRows(a: ScheduleDateRow, b: ScheduleDateRow) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.date.localeCompare(b.date);
}

