"use client";

import { useMemo, useState } from "react";
import { X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const DOW_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

export interface ScheduleDateLite {
  id: string;
  date: string; // YYYY-MM-DD (KST 기준 저장값)
  label: string | null;
  kind: string; // "event" | "practice"
}

export interface TimeRangeModalProps {
  open: boolean;
  scheduleDates: ScheduleDateLite[];
  // 현재 각 일정의 status 를 전달 → unavailable 인 항목은 시각적으로 회색 처리
  statusMap: Record<string, string>;
  onClose: () => void;
  onApply: (payload: {
    scheduleDateIds: string[];
    start: string; // "HH:MM"
    end: string;   // "HH:MM"
  }) => void;
}

type Preset = { key: string; label: string; start: string; end: string };

const PRESETS: Preset[] = [
  { key: "allday", label: "종일", start: "10:00", end: "22:00" },
  { key: "morning", label: "오전 (09:00~12:00)", start: "09:00", end: "12:00" },
  { key: "afternoon", label: "오후 (13:00~18:00)", start: "13:00", end: "18:00" },
  { key: "evening", label: "저녁 (18:00~22:00)", start: "18:00", end: "22:00" },
];

function kstFormat(dateStr: string): { d: number; dow: string } {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  // day-of-month 를 KST 로 뽑기 위해 toLocaleString 사용
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d);
  const dayPart = parts.find((p) => p.type === "day")?.value ?? "";
  const weekPart = parts.find((p) => p.type === "weekday")?.value ?? "";
  return { d: Number(dayPart), dow: weekPart || DOW_SHORT[d.getUTCDay()] };
}

export function TimeRangeModal({
  open,
  scheduleDates,
  statusMap,
  onClose,
  onApply,
}: TimeRangeModalProps) {
  const [start, setStart] = useState<string>("13:00");
  const [end, setEnd] = useState<string>("18:00");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const selectableIds = useMemo(
    () => scheduleDates.filter((d) => statusMap[d.id] !== "unavailable").map((d) => d.id),
    [scheduleDates, statusMap]
  );

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  if (!open) return null;

  const toggleId = (id: string, isUnavailable: boolean) => {
    if (isUnavailable) return; // unavailable 은 버튼 자체를 disabled
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableIds));
  };

  const applyPreset = (p: Preset) => {
    setStart(p.start);
    setEnd(p.end);
  };

  const handleApply = () => {
    if (!start || !end || start >= end) return;
    if (selectedIds.size === 0) return;
    onApply({ scheduleDateIds: Array.from(selectedIds), start, end });
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, padding: 20, maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="row mb-12" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row gap-6" style={{ alignItems: "center" }}>
            <Clock size={16} strokeWidth={2} />
            <strong>시간대 일괄 추가</strong>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="닫기">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* 시간 프리셋 */}
        <div className="mb-12">
          <div className="lab" style={{ fontSize: 11, marginBottom: 6 }}>빠른 선택</div>
          <div className="row gap-6" style={{ flexWrap: "wrap" }}>
            {PRESETS.map((p) => {
              const active = start === p.start && end === p.end;
              return (
                <button
                  key={p.key}
                  type="button"
                  className={cn("btn sm", active && "primary")}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 직접 시간 설정 */}
        <div className="field">
          <label>시작 ~ 종료 <span className="hint">(KST)</span></label>
          <div className="row gap-8" style={{ alignItems: "center" }}>
            <input
              type="time"
              step={900}
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ color: "var(--mf)" }}>~</span>
            <input
              type="time"
              step={900}
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          {start >= end && (
            <div className="hint" style={{ color: "var(--danger, #c33)", marginTop: 4 }}>
              종료 시간은 시작보다 늦어야 합니다
            </div>
          )}
        </div>

        {/* 적용할 날짜 선택 */}
        <div className="field">
          <div className="row mb-6" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ margin: 0 }}>
              적용할 날짜 <span className="hint">· 여러 개 선택 가능</span>
            </label>
            <button type="button" className="btn ghost sm" onClick={toggleAll}>
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
              gap: 6,
            }}
          >
            {scheduleDates.map((d) => {
              const isUnavailable = statusMap[d.id] === "unavailable";
              const selected = selectedIds.has(d.id);
              const { d: dayNum, dow } = kstFormat(d.date);
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => toggleId(d.id, isUnavailable)}
                  className={cn(
                    "btn sm",
                    selected && "primary",
                    isUnavailable && "ghost"
                  )}
                  style={{
                    flexDirection: "column",
                    gap: 2,
                    padding: "6px 4px",
                    opacity: isUnavailable ? 0.4 : 1,
                    cursor: isUnavailable ? "not-allowed" : "pointer",
                  }}
                  title={isUnavailable ? "불가 표시된 날짜" : `${d.date} ${d.label ?? ""}`.trim()}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{dayNum}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {dow}
                    {d.kind === "practice" ? " · 연습" : ""}
                  </span>
                  {d.label && (
                    <span style={{ fontSize: 9, opacity: 0.6, fontFamily: "var(--font-mono)" }}>
                      {d.label.length > 6 ? d.label.slice(0, 6) + "…" : d.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={onClose}>취소</button>
          <button
            type="button"
            className="btn primary"
            disabled={selectedIds.size === 0 || !start || !end || start >= end}
            onClick={handleApply}
          >
            {selectedIds.size > 0 ? `${selectedIds.size}개 날짜에 적용` : "날짜를 선택하세요"}
          </button>
        </div>
      </div>
    </div>
  );
}
