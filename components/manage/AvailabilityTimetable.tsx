"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeTimeRange,
  evaluateCell,
  findBestContiguousRange,
  minToHHMM,
  SLOT_SIZE_MIN,
  type VoteLite,
} from "@/lib/availability";
import type { TimeSlot } from "@/lib/types";

export interface TimetableApplication {
  id: string;
  status: string;
  user_id: string | null;
  guest_name: string | null;
  crew_members: { name: string; stage_name: string | null } | null;
}

export interface TimetableScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
}

export interface TimetableVoteRow {
  schedule_date_id: string;
  user_id: string;
  status: string;
  time_slots: Array<{ start: string; end: string; kind?: "available" | "unavailable" }>;
  note: string | null;
}

interface Props {
  scheduleDates: TimetableScheduleDate[];
  pool: TimetableApplication[];
  votes: TimetableVoteRow[];
  onEditMember?: (appId: string) => void;
}

function appName(a: TimetableApplication): string {
  const stage = a.crew_members?.stage_name?.trim();
  const real = a.crew_members?.name?.trim();
  return stage || real || a.guest_name || "지원자";
}

function kstDayDow(dateStr: string): { day: number; dow: string; month: number } {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(`${dateStr}T00:00:00+09:00`));
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const dow = parts.find((p) => p.type === "weekday")?.value ?? "";
  return { day, dow, month };
}

export function AvailabilityTimetable({
  scheduleDates,
  pool,
  votes,
  onEditMember,
}: Props) {
  // user_id → schedule_date_id → vote
  const votesByUser = useMemo(() => {
    const m = new Map<string, Map<string, VoteLite>>();
    for (const v of votes) {
      if (!m.has(v.user_id)) m.set(v.user_id, new Map());
      m.get(v.user_id)!.set(v.schedule_date_id, {
        status: v.status as VoteLite["status"],
        time_slots: v.time_slots,
        note: v.note,
      });
    }
    return m;
  }, [votes]);

  // schedule_date_id → (user_id → VoteLite)
  const votesByDate = useMemo(() => {
    const m = new Map<string, Map<string, VoteLite>>();
    for (const d of scheduleDates) m.set(d.id, new Map());
    for (const v of votes) {
      const bucket = m.get(v.schedule_date_id);
      if (!bucket) continue;
      bucket.set(v.user_id, {
        status: v.status as VoteLite["status"],
        time_slots: v.time_slots,
        note: v.note,
      });
    }
    return m;
  }, [scheduleDates, votes]);

  // 시간 범위
  const range = useMemo(() => {
    const allSlots: TimeSlot[] = [];
    for (const v of votes) {
      for (const s of v.time_slots ?? []) allSlots.push(s);
    }
    return computeTimeRange(allSlots);
  }, [votes]);

  const appById = useMemo(() => {
    const m = new Map<string, TimetableApplication>();
    for (const a of pool) m.set(a.id, a);
    return m;
  }, [pool]);

  // 날짜×슬롯 매트릭스 & 날짜별 최적 구간
  const matrix = useMemo(() => {
    const rows: Array<{
      date: TimetableScheduleDate;
      cells: ReturnType<typeof evaluateCell>[];
      ratios: number[];
      best: { from: number; to: number } | null;
    }> = [];
    for (const d of scheduleDates) {
      const votesForDate = votesByDate.get(d.id) ?? new Map<string, VoteLite>();
      const cells: ReturnType<typeof evaluateCell>[] = [];
      const ratios: number[] = [];
      for (let i = 0; i < range.totalSlots; i++) {
        const c = evaluateCell(i, pool, votesForDate, range.startMin, range.totalSlots);
        cells.push(c);
        ratios.push(pool.length === 0 ? 0 : c.avail.length / pool.length);
      }
      rows.push({ date: d, cells, ratios, best: findBestContiguousRange(ratios) });
    }
    return rows;
  }, [scheduleDates, pool, votesByDate, range]);

  const [popover, setPopover] = useState<{
    dateId: string;
    slotIdx: number;
  } | null>(null);

  if (scheduleDates.length === 0) {
    return <div className="empty">등록된 일정이 없어요</div>;
  }
  if (pool.length === 0) {
    return <div className="empty">분석할 지원자가 없어요</div>;
  }

  const numRows = range.totalSlots;
  const timeLabels: Array<{ idx: number; label: string; major: boolean }> = [];
  for (let i = 0; i < numRows; i++) {
    const min = range.startMin + i * SLOT_SIZE_MIN;
    timeLabels.push({
      idx: i,
      label: minToHHMM(min),
      major: min % 60 === 0,
    });
  }

  const CELL_H = 22;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* 범례 */}
      <div
        className="row gap-8"
        style={{
          padding: "10px 16px",
          fontSize: 11,
          color: "var(--mf)",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span>가능자 비율</span>
        <div className="row gap-4" style={{ alignItems: "center" }}>
          <span
            style={{
              width: 14,
              height: 14,
              background: "rgba(34,197,94,0.10)",
              border: "1px solid var(--border)",
              borderRadius: 3,
            }}
          />
          <span>낮음</span>
        </div>
        <div className="row gap-4" style={{ alignItems: "center" }}>
          <span
            style={{
              width: 14,
              height: 14,
              background: "rgba(34,197,94,0.55)",
              border: "1px solid var(--border)",
              borderRadius: 3,
            }}
          />
          <span>높음</span>
        </div>
        <span style={{ marginLeft: 12 }}>
          셀 클릭 → 명단 / <kbd>✎</kbd> → 관리자 수정
        </span>
      </div>

      <div style={{ overflow: "auto", maxHeight: "70vh" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `60px repeat(${scheduleDates.length}, minmax(88px, 1fr))`,
            minWidth: 60 + scheduleDates.length * 88,
            fontSize: 11,
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              position: "sticky",
              top: 0,
              left: 0,
              zIndex: 3,
              background: "var(--bg)",
              borderBottom: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
            }}
          />
          {scheduleDates.map((d) => {
            const { day, dow, month } = kstDayDow(d.date);
            const isPractice = d.kind === "practice";
            return (
              <div
                key={`h-${d.id}`}
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "var(--bg)",
                  padding: "6px 4px",
                  textAlign: "center",
                  borderBottom: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  fontSize: 11,
                }}
                title={d.label ?? ""}
              >
                <div style={{ fontFamily: "var(--font-mono)" }}>
                  {month}/{day} ({dow})
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: isPractice ? "var(--mf)" : "var(--accent, #3b82f6)",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {isPractice ? "연습" : "본행사"}
                </div>
                {d.label && (
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--mf)",
                      marginTop: 2,
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {d.label}
                  </div>
                )}
              </div>
            );
          })}

          {/* 행 */}
          {timeLabels.map((t) => (
            <RowFragment
              key={`r-${t.idx}`}
              timeLabel={t.label}
              major={t.major}
              cellHeight={CELL_H}
            >
              {matrix.map((row) => {
                const cell = row.cells[t.idx];
                const total = pool.length;
                const availCount = cell.avail.length;
                const adjustCount = cell.adjust.length;
                const ratio = total === 0 ? 0 : availCount / total;
                const bg =
                  ratio > 0
                    ? `rgba(34,197,94,${Math.max(0.08, Math.min(0.55, ratio * 0.6))})`
                    : adjustCount > 0
                      ? "rgba(250,204,21,0.15)"
                      : "transparent";
                const inBest =
                  row.best !== null &&
                  t.idx >= row.best.from &&
                  t.idx < row.best.to;
                const active =
                  popover?.dateId === row.date.id && popover.slotIdx === t.idx;

                const tooltipNames = cell.avail
                  .slice(0, 5)
                  .map((id) => appName(appById.get(id)!))
                  .join(", ");
                const extra = cell.avail.length > 5 ? ` +${cell.avail.length - 5}` : "";
                const tt = `${row.date.date} ${t.label} — 가능 ${availCount}/${total}${tooltipNames ? `\n${tooltipNames}${extra}` : ""}${adjustCount ? `\n조정 ${adjustCount}명` : ""}`;

                return (
                  <button
                    key={`c-${row.date.id}-${t.idx}`}
                    type="button"
                    onClick={() =>
                      setPopover(
                        active ? null : { dateId: row.date.id, slotIdx: t.idx }
                      )
                    }
                    title={tt}
                    style={{
                      height: CELL_H,
                      background: bg,
                      borderRight: "1px solid var(--border)",
                      borderBottom: t.major
                        ? "1px solid var(--border)"
                        : "1px dashed rgba(0,0,0,0.06)",
                      outline: inBest
                        ? "2px solid var(--accent, #3b82f6)"
                        : active
                          ? "2px solid var(--fg)"
                          : "none",
                      outlineOffset: -2,
                      position: "relative",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: ratio > 0.4 ? "#052e16" : "var(--mf)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {availCount > 0 ? `${availCount}` : ""}
                    {adjustCount > 0 && availCount === 0 && (
                      <span style={{ color: "#a16207" }}>◇</span>
                    )}
                  </button>
                );
              })}
            </RowFragment>
          ))}
        </div>
      </div>

      {popover && (() => {
        const row = matrix.find((r) => r.date.id === popover.dateId);
        if (!row) return null;
        const cell = row.cells[popover.slotIdx];
        const startLabel = minToHHMM(
          range.startMin + popover.slotIdx * SLOT_SIZE_MIN
        );
        const endLabel = minToHHMM(
          range.startMin + (popover.slotIdx + 1) * SLOT_SIZE_MIN
        );
        return (
          <CellPopover
            title={`${row.date.date} ${startLabel}~${endLabel}`}
            cell={cell}
            appById={appById}
            onClose={() => setPopover(null)}
            onEditMember={onEditMember}
          />
        );
      })()}
    </div>
  );
}

function RowFragment({
  timeLabel,
  major,
  cellHeight,
  children,
}: {
  timeLabel: string;
  major: boolean;
  cellHeight: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        style={{
          position: "sticky",
          left: 0,
          zIndex: 1,
          background: "var(--bg)",
          height: cellHeight,
          padding: "0 6px",
          borderRight: "1px solid var(--border)",
          borderBottom: major
            ? "1px solid var(--border)"
            : "1px dashed rgba(0,0,0,0.06)",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: major ? "var(--fg)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          fontWeight: major ? 600 : 400,
        }}
      >
        {major ? timeLabel : ""}
      </div>
      {children}
    </>
  );
}

function CellPopover({
  title,
  cell,
  appById,
  onClose,
  onEditMember,
}: {
  title: string;
  cell: ReturnType<typeof evaluateCell>;
  appById: Map<string, TimetableApplication>;
  onClose: () => void;
  onEditMember?: (appId: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, padding: 0 }}
      >
        <div
          className="row"
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
            {title}
          </strong>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
        <div style={{ padding: 14, maxHeight: "60vh", overflowY: "auto" }}>
          <PopoverGroup
            label="가능"
            color="#16a34a"
            ids={cell.avail}
            appById={appById}
            onEditMember={onEditMember}
          />
          <PopoverGroup
            label="조정가능"
            color="#a16207"
            ids={cell.adjust}
            appById={appById}
            onEditMember={onEditMember}
          />
          <PopoverGroup
            label="불가"
            color="#64748b"
            ids={cell.unavail}
            appById={appById}
            onEditMember={onEditMember}
          />
          <PopoverGroup
            label="미응답"
            color="#94a3b8"
            ids={cell.none}
            appById={appById}
            onEditMember={onEditMember}
          />
        </div>
      </div>
    </div>
  );
}

function PopoverGroup({
  label,
  color,
  ids,
  appById,
  onEditMember,
}: {
  label: string;
  color: string;
  ids: string[];
  appById: Map<string, TimetableApplication>;
  onEditMember?: (appId: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label} · {ids.length}
      </div>
      <div className="row gap-6" style={{ flexWrap: "wrap" }}>
        {ids.map((id) => {
          const a = appById.get(id);
          if (!a) return null;
          const pending = a.status === "pending";
          return (
            <div
              key={id}
              className={cn("tag sm")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "var(--muted)",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <span>{appName(a)}</span>
              {pending && (
                <span style={{ fontSize: 9, color: "var(--mf)" }}>(검토중)</span>
              )}
              {onEditMember && a.user_id && (
                <button
                  type="button"
                  onClick={() => onEditMember(a.id)}
                  aria-label="가능시간 수정"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "var(--mf)",
                    display: "inline-flex",
                  }}
                >
                  <Pencil size={10} strokeWidth={2} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
