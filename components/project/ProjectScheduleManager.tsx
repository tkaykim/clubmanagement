"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarPlus, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Kind = "event" | "practice";

export type ScheduleDateRow = {
  id: string;
  project_id: string;
  date: string;
  label: string | null;
  kind: Kind;
  sort_order: number;
  is_confirmed: boolean;
  confirmed_at: string | null;
};

interface Props {
  projectId: string;
  initialDates?: ScheduleDateRow[];
  /** 추가/수정/삭제 성공 시 호출 — 부모 뷰(타임테이블/열지도 등) 새로고침에 사용 */
  onMutated?: () => void;
}

const MAX_RANGE_DAYS = 90;

function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return out;
  const cursor = new Date(s);
  while (cursor <= e) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function ProjectScheduleManager({ projectId, initialDates, onMutated }: Props) {
  const [rows, setRows] = useState<ScheduleDateRow[]>(initialDates ?? []);
  const persistedLabels = useRef<Record<string, string | null>>(
    Object.fromEntries((initialDates ?? []).map((row) => [row.id, row.label]))
  );
  const [loading, setLoading] = useState(!initialDates);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"single" | "range">("single");
  const [expanded, setExpanded] = useState(false);

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
  const confirmedCount = rows.filter((row) => row.is_confirmed).length;

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
      const nextRows: ScheduleDateRow[] = json.data ?? [];
      persistedLabels.current = Object.fromEntries(
        nextRows.map((row) => [row.id, row.label])
      );
      setRows(nextRows);
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
      persistedLabels.current[json.data.id] = json.data.label;
      setRows((prev) => [...prev, json.data].sort(sortRows));
      setNewDate("");
      setNewLabel("");
      toast.success("일정이 추가됐어요");
      onMutated?.();
    } catch {
      toast.error("네트워크 오류로 일정을 추가하지 못했습니다");
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
        persistedLabels.current[json.data.id] = json.data.label;
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
        onMutated?.();
      }
    } catch {
      toast.error("네트워크 오류로 일정 범위를 추가하지 못했습니다");
    } finally {
      setAddingRange(false);
    }
  }

  async function updateRow(
    id: string,
    patch: Partial<Pick<ScheduleDateRow, "date" | "label" | "kind" | "is_confirmed">>,
    rollbackPatch: Partial<ScheduleDateRow> = {}
  ) {
    const before = rows.map((row) =>
      row.id === id ? { ...row, ...rollbackPatch } : row
    );
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
      if ("label" in patch) persistedLabels.current[id] = json.data.label;
      setRows((prev) => prev.map((r) => (r.id === id ? json.data : r)).sort(sortRows));
      onMutated?.();
    } catch {
      setRows(before);
      toast.error("네트워크 오류로 일정 변경을 저장하지 못했습니다");
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
      delete persistedLabels.current[id];
      toast.success("일정이 삭제됐어요");
      onMutated?.();
    } catch {
      setRows(before);
      toast.error("네트워크 오류로 일정을 삭제하지 못했습니다");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="card">
      <button
        type="button"
        className="card-head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>일정 후보 관리</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11.5, color: "var(--mf)" }}>
            후보 {rows.length - confirmedCount} · 확정 {confirmedCount}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            style={{
              transition: "transform 160ms ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              color: "var(--mf)",
            }}
          />
        </div>
      </button>
      {expanded && (
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
          후보 날짜를 검토한 뒤 확정으로 표시하세요. 확정 일정만 멤버의 캘린더에 기본 표시됩니다.
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
                aria-label="추가할 일정 날짜"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <select
                className="select"
                aria-label="추가할 일정 종류"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as Kind)}
              >
                <option value="event">본행사</option>
                <option value="practice">연습</option>
              </select>
            </div>
            <input
              className="input"
              aria-label="추가할 일정 라벨"
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
                aria-label="범위 일정 종류"
                value={rangeKind}
                onChange={(e) => setRangeKind(e.target.value as Kind)}
              >
                <option value="event">본행사</option>
                <option value="practice">연습</option>
              </select>
              <input
                className="input"
                aria-label="범위 일정 공통 라벨"
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
                  className="schedule-manager-row"
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    gap: 8,
                  }}
                >
                  <input
                    className="input mono"
                    type="date"
                    aria-label={`${r.date} 일정 날짜`}
                    value={r.date}
                    onChange={(e) => updateRow(r.id, { date: e.target.value })}
                    style={{ width: "100%", height: 32, padding: "2px 6px", fontSize: 12 }}
                    disabled={savingId === r.id}
                  />
                  <select
                    className="select"
                    aria-label={`${r.date} 일정 종류`}
                    value={r.kind}
                    onChange={(e) => updateRow(r.id, { kind: e.target.value as Kind })}
                    style={{ width: "100%", height: 32, padding: "2px 6px", fontSize: 12 }}
                    disabled={savingId === r.id}
                  >
                    <option value="event">본행사</option>
                    <option value="practice">연습</option>
                  </select>
                  <input
                    className="input"
                    aria-label={`${r.date} 일정 라벨`}
                    placeholder="라벨"
                    value={r.label ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((row) => (row.id === r.id ? { ...row, label: e.target.value } : row))
                      )
                    }
                    onBlur={(e) => {
                      const next = e.target.value.trim() || null;
                      const persisted = persistedLabels.current[r.id] ?? null;
                      if (next === persisted) {
                        setRows((prev) => prev.map((row) =>
                          row.id === r.id ? { ...row, label: persisted } : row
                        ));
                        return;
                      }
                      void updateRow(r.id, { label: next }, { label: persisted });
                    }}
                    style={{ width: "100%", height: 32, padding: "2px 8px", fontSize: 12 }}
                    disabled={savingId === r.id}
                  />
                  <button
                    type="button"
                    className={`btn sm ${r.is_confirmed ? "primary" : ""}`}
                    onClick={() => void updateRow(r.id, { is_confirmed: !r.is_confirmed })}
                    aria-pressed={r.is_confirmed}
                    aria-label={`${r.date} ${r.is_confirmed ? "확정 해제" : "일정 확정"}`}
                    disabled={savingId === r.id}
                    style={{ minWidth: 86, justifyContent: "center" }}
                  >
                    <CalendarCheck size={12} strokeWidth={2} />
                    {r.is_confirmed ? "확정됨" : "확정"}
                  </button>
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
      )}
    </div>
  );
}

function sortRows(a: ScheduleDateRow, b: ScheduleDateRow) {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.date.localeCompare(b.date);
}

