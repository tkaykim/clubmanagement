"use client";

import { useMemo, useState } from "react";
import { Plus, X, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimeRangeModal, type ScheduleDateLite } from "./TimeRangeModal";
import { SingleDateTimeModal } from "./SingleDateTimeModal";
import type { TimeSlotKind } from "@/lib/types";

const DOW_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

export type VoteStatus = "available" | "partial" | "adjustable" | "unavailable";

export type TimeSlot = { start: string; end: string; kind?: TimeSlotKind };

export interface VoteState {
  status: VoteStatus;
  time_slots: TimeSlot[];
  note?: string;
}

export type VotesMap = Record<string, VoteState>;

interface VoteScheduleEditorProps {
  scheduleDates: ScheduleDateLite[];
  value: VotesMap;
  onChange: (next: VotesMap) => void;
  showNotice?: boolean; // KST 안내 줄 노출
}

const STATUS_OPTIONS: { value: VoteStatus; label: string; description: string }[] = [
  { value: "available", label: "가능", description: "전체 시간 가능" },
  { value: "partial", label: "부분가능", description: "일부 시간만 가능 — 시간대 필수" },
  { value: "adjustable", label: "조정가능", description: "전체되지만 협의 필요" },
  { value: "unavailable", label: "불가", description: "참여 불가" },
];

function kstDayDow(dateStr: string): { month: number; day: number; dow: string } {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(`${dateStr}T00:00:00+09:00`));
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const dow = parts.find((p) => p.type === "weekday")?.value ?? DOW_SHORT[new Date(dateStr + "T00:00:00").getDay()];
  return { month, day, dow };
}

function slotKey(s: TimeSlot) {
  return `${s.start}-${s.end}-${s.kind ?? "available"}`;
}

function addSlot(slots: TimeSlot[], slot: TimeSlot): TimeSlot[] {
  // 동일 kind + 동일 구간 중복 방지
  const key = slotKey(slot);
  if (slots.some((s) => slotKey(s) === key)) return slots;
  return [...slots, slot].sort((a, b) => a.start.localeCompare(b.start));
}

export function VoteScheduleEditor({
  scheduleDates,
  value,
  onChange,
  showNotice = true,
}: VoteScheduleEditorProps) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [singleDate, setSingleDate] = useState<ScheduleDateLite | null>(null);

  const statusMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of scheduleDates) m[d.id] = value[d.id]?.status ?? "available";
    return m;
  }, [scheduleDates, value]);

  const updateVote = (dateId: string, partial: Partial<VoteState>) => {
    const current = value[dateId] ?? { status: "available" as VoteStatus, time_slots: [], note: "" };
    onChange({ ...value, [dateId]: { ...current, ...partial } });
  };

  const handleBulkApply = (payload: {
    scheduleDateIds: string[];
    start: string;
    end: string;
    kind: TimeSlotKind;
  }) => {
    const next = { ...value };
    for (const id of payload.scheduleDateIds) {
      const prev = next[id] ?? { status: "available" as VoteStatus, time_slots: [], note: "" };
      if (prev.status === "unavailable") continue;
      next[id] = {
        ...prev,
        time_slots: addSlot(prev.time_slots, {
          start: payload.start,
          end: payload.end,
          kind: payload.kind,
        }),
      };
    }
    onChange(next);
  };

  const handleSingleApply = (payload: {
    scheduleDateId: string;
    start: string;
    end: string;
    kind: TimeSlotKind;
  }) => {
    const prev = value[payload.scheduleDateId] ?? {
      status: "available" as VoteStatus,
      time_slots: [],
      note: "",
    };
    // 시간 슬롯이 추가되면 status 가 "불가" 였더라도 "부분가능" 으로 승격
    const nextStatus: VoteStatus =
      prev.status === "unavailable" ? "partial" : prev.status;
    onChange({
      ...value,
      [payload.scheduleDateId]: {
        ...prev,
        status: nextStatus,
        time_slots: addSlot(prev.time_slots, {
          start: payload.start,
          end: payload.end,
          kind: payload.kind,
        }),
      },
    });
  };

  if (scheduleDates.length === 0) {
    return <div className="empty">등록된 일정이 없어요</div>;
  }

  return (
    <div>
      {showNotice && (
        <div className="row mb-8" style={{ gap: 8, alignItems: "center", fontSize: 12, color: "var(--mf)" }}>
          <CalendarClock size={12} strokeWidth={2} />
          <span>모든 시간은 한국 표준시(KST) 기준입니다</span>
        </div>
      )}

      <div className="row mb-12" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn sm"
          onClick={() => setBulkOpen(true)}
          title="여러 날짜에 동일한 시간 구간을 한 번에 추가합니다"
        >
          <Plus size={12} strokeWidth={2} />
          시간대 일괄 추가
        </button>
      </div>

      <div className="sched">
        {scheduleDates.map((d) => {
          const v = value[d.id] ?? { status: "available" as VoteStatus, time_slots: [], note: "" };
          const { month, day, dow } = kstDayDow(d.date);
          const isPractice = d.kind === "practice";

          return (
            <div key={d.id} className="sched-row">
              <div className="date-col">
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--mf)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 500,
                    lineHeight: 1,
                  }}
                >
                  {month}월
                </div>
                <div className="d">{day}</div>
                <div className="dow">{dow}</div>
                <div
                  style={{
                    fontSize: 9,
                    marginTop: 4,
                    padding: "1px 4px",
                    borderRadius: 4,
                    display: "inline-block",
                    background: isPractice ? "var(--muted)" : "var(--accent-soft, #f0f4ff)",
                    color: isPractice ? "var(--mf)" : "var(--accent, #3b82f6)",
                    fontWeight: 600,
                  }}
                >
                  {isPractice ? "연습" : "본행사"}
                </div>
                {d.label && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--mf)",
                      marginTop: 4,
                      fontFamily: "var(--font-mono)",
                      wordBreak: "keep-all",
                    }}
                    title={d.label}
                  >
                    {d.label}
                  </div>
                )}
              </div>
              <div className="body">
                <div className="seg full">
                  {STATUS_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={cn(v.status === o.value && "on")}
                      onClick={() => updateVote(d.id, { status: o.value })}
                      title={o.description}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {v.status !== "unavailable" && (
                  <div className="timeslots">
                    {v.time_slots.map((slot, i) => {
                      const unavail = slot.kind === "unavailable";
                      return (
                        <span
                          key={`${slot.start}-${slot.end}-${i}`}
                          className="slot"
                          style={
                            unavail
                              ? {
                                  background: "var(--danger-soft, #fdecec)",
                                  color: "var(--danger, #c33)",
                                  borderColor: "var(--danger, #c33)",
                                }
                              : undefined
                          }
                          title={unavail ? "이 시간대는 불가" : "이 시간대에 가능"}
                        >
                          {unavail ? "✕ " : ""}
                          {slot.start}~{slot.end}
                          <X
                            size={10}
                            className="x"
                            onClick={() => {
                              const nextSlots = v.time_slots.filter((_, idx) => idx !== i);
                              updateVote(d.id, { time_slots: nextSlots });
                            }}
                          />
                        </span>
                      );
                    })}
                    {v.status === "partial" && v.time_slots.length === 0 && (
                      <span className="hint" style={{ color: "var(--danger, #c33)", fontSize: 11 }}>
                        부분가능은 시간대 1개 이상 필요합니다
                      </span>
                    )}
                    <button
                      type="button"
                      className="slot add"
                      onClick={() => setSingleDate(d)}
                      title="이 날짜에만 시간 구간을 추가합니다"
                    >
                      <Plus size={10} />
                      시간 추가
                    </button>
                  </div>
                )}

                {v.status === "adjustable" && (
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="협의 희망 사항 (예: 17시 이후 희망)"
                      value={v.note ?? ""}
                      onChange={(e) => updateVote(d.id, { note: e.target.value })}
                      style={{ fontSize: 12, height: 32 }}
                      maxLength={200}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TimeRangeModal
        open={bulkOpen}
        scheduleDates={scheduleDates}
        statusMap={statusMap}
        onClose={() => setBulkOpen(false)}
        onApply={handleBulkApply}
      />

      <SingleDateTimeModal
        open={singleDate !== null}
        scheduleDate={singleDate}
        onClose={() => setSingleDate(null)}
        onApply={handleSingleApply}
      />
    </div>
  );
}

export function initialVotesFromSchedule(
  scheduleDates: ScheduleDateLite[]
): VotesMap {
  const out: VotesMap = {};
  for (const d of scheduleDates) {
    out[d.id] = { status: "available", time_slots: [], note: "" };
  }
  return out;
}
