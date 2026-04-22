"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeSlotKind } from "@/lib/types";
import type { ScheduleDateLite } from "./TimeRangeModal";

const DOW_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

export interface SingleDateTimeModalProps {
  open: boolean;
  scheduleDate: ScheduleDateLite | null;
  onClose: () => void;
  onApply: (payload: {
    scheduleDateId: string;
    start: string;
    end: string;
    kind: TimeSlotKind;
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
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d);
  const dayPart = parts.find((p) => p.type === "day")?.value ?? "";
  const weekPart = parts.find((p) => p.type === "weekday")?.value ?? "";
  return { d: Number(dayPart), dow: weekPart || DOW_SHORT[d.getUTCDay()] };
}

/**
 * 단일 날짜에 대해 시작~종료 + 가능/불가 를 선택하는 모달.
 * TimeRangeModal(일괄 적용)과 용도가 다르다 — "이 날짜만" 시간 구간 1개를 추가한다.
 */
export function SingleDateTimeModal({
  open,
  scheduleDate,
  onClose,
  onApply,
}: SingleDateTimeModalProps) {
  const [start, setStart] = useState<string>("13:00");
  const [end, setEnd] = useState<string>("18:00");
  const [kind, setKind] = useState<TimeSlotKind>("available");

  // 모달 열릴 때마다 기본값 리셋
  useEffect(() => {
    if (open) {
      setStart("13:00");
      setEnd("18:00");
      setKind("available");
    }
  }, [open]);

  const header = useMemo(() => {
    if (!scheduleDate) return "";
    const { d, dow } = kstFormat(scheduleDate.date);
    const labelBit =
      scheduleDate.label ??
      (scheduleDate.kind === "practice" ? "연습" : "본행사");
    return `${d}일 (${dow}) · ${labelBit}`;
  }, [scheduleDate]);

  if (!open || !scheduleDate) return null;

  const applyPreset = (p: Preset) => {
    setStart(p.start);
    setEnd(p.end);
  };

  const handleApply = () => {
    if (!start || !end || start >= end) return;
    onApply({ scheduleDateId: scheduleDate.id, start, end, kind });
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
        style={{ width: "100%", maxWidth: 440, padding: 20, maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="row mb-12" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row gap-6" style={{ alignItems: "center" }}>
            <Clock size={16} strokeWidth={2} />
            <strong>시간 추가</strong>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="닫기">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div
          className="mb-12"
          style={{
            padding: "8px 10px",
            background: "var(--muted)",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {header}
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

        {/* 가능 / 불가 선택 */}
        <div className="field">
          <label>이 시간대에</label>
          <div className="seg full">
            <button
              type="button"
              className={cn(kind === "available" && "on")}
              onClick={() => setKind("available")}
            >
              가능
            </button>
            <button
              type="button"
              className={cn(kind === "unavailable" && "on")}
              onClick={() => setKind("unavailable")}
            >
              불가능
            </button>
          </div>
          <div className="hint" style={{ marginTop: 6, fontSize: 11 }}>
            {kind === "available"
              ? "이 시간대에는 참여 가능"
              : "이 시간대에는 참여 불가 — 나머지 시간은 가능"}
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={onClose}>취소</button>
          <button
            type="button"
            className="btn primary"
            disabled={!start || !end || start >= end}
            onClick={handleApply}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
