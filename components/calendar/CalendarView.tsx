"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthMatrix, pad2, toYearMonth } from "@/lib/utils";

const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface ScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
  projects: { id: string; title: string; type: string; venue: string | null };
}

interface VoteData {
  schedule_date_id: string;
  status: string;
}

interface CalendarViewProps {
  scheduleDates: ScheduleDate[];
  myVotes: VoteData[];
}

export function CalendarView({ scheduleDates, myVotes }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const cells = monthMatrix(year, month);

  // 날짜별 이벤트 맵
  const eventMap: Record<string, ScheduleDate[]> = {};
  for (const sd of scheduleDates) {
    if (!eventMap[sd.date]) eventMap[sd.date] = [];
    eventMap[sd.date].push(sd);
  }

  // 투표 맵
  const voteMap: Record<string, string> = {};
  for (const v of myVotes) {
    voteMap[v.schedule_date_id] = v.status;
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const ym = `${year}년 ${month + 1}월`;

  return (
    <div>
      {/* 컨트롤 */}
      <div className="row mb-16" style={{ justifyContent: "space-between" }}>
        <div className="row gap-8">
          <button className="btn icon-only sm" onClick={prevMonth} aria-label="이전 달">
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <b style={{ fontSize: 15, minWidth: 100, textAlign: "center" }}>{ym}</b>
          <button className="btn icon-only sm" onClick={nextMonth} aria-label="다음 달">
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
        <button className="btn sm" onClick={goToday}>오늘</button>
      </div>

      <div className="card flush">
        <div className="cal">
          {/* 요일 헤더 */}
          {DOW_FULL.map(d => (
            <div key={d} className="cal-dow">{d}</div>
          ))}

          {/* 날짜 셀 */}
          {cells.map(cellDate => {
            const dateStr = `${cellDate.getFullYear()}-${pad2(cellDate.getMonth() + 1)}-${pad2(cellDate.getDate())}`;
            const isCurMonth = cellDate.getMonth() === month;
            const isToday = dateStr === `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
            const events = eventMap[dateStr] ?? [];

            return (
              <div
                key={dateStr}
                className={`cal-cell ${!isCurMonth ? "other" : ""} ${isToday ? "today" : ""}`}
              >
                <span className="d">{cellDate.getDate()}</span>
                {events.slice(0, 3).map(ev => {
                  const myVote = voteMap[ev.id];
                  const cls = ev.kind === "event" ? "ok" : ev.kind === "practice" ? "warn" : "";
                  return (
                    <div
                      key={ev.id}
                      className={`evt ${cls}`}
                      title={`${ev.projects?.title ?? ""}${myVote ? ` (${myVote})` : ""}`}
                    >
                      {ev.projects?.title ?? ev.label ?? ev.kind}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="row" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", gap: 16 }}>
          <div className="row gap-6">
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ok)", opacity: 0.6 }} />
            <span className="mono text-xs muted">본행사</span>
          </div>
          <div className="row gap-6">
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--warn)", opacity: 0.6 }} />
            <span className="mono text-xs muted">연습</span>
          </div>
        </div>
      </div>
    </div>
  );
}
