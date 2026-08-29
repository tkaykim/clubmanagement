"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { monthMatrix, pad2 } from "@/lib/utils";
import {
  filterCalendarDatesForMode,
  getCalendarMonthEvents,
  groupCalendarEventsByDate,
  shiftCalendarMonth,
  type CalendarMode,
  type CalendarScheduleDate,
} from "@/lib/calendar";

const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const VOTE_LABEL: Record<string, string> = {
  available: "가능",
  partial: "부분가능",
  adjustable: "조정가능",
  unavailable: "불가",
};

interface CalendarViewProps {
  scheduleDates: CalendarScheduleDate[];
  isAdmin: boolean;
}

export function CalendarView({ scheduleDates, isAdmin }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [mode, setMode] = useState<CalendarMode>(isAdmin ? "all_confirmed" : "mine");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const visibleDates = useMemo(
    () => filterCalendarDatesForMode(scheduleDates, mode),
    [mode, scheduleDates]
  );

  const eventMap = useMemo(() => {
    const map: Record<string, CalendarScheduleDate[]> = {};
    for (const row of visibleDates) {
      if (!map[row.date]) map[row.date] = [];
      map[row.date].push(row);
    }
    return map;
  }, [visibleDates]);

  const monthEvents = useMemo(
    () => getCalendarMonthEvents(visibleDates, year, month),
    [month, visibleDates, year]
  );

  const groupedMonthEvents = useMemo(
    () => groupCalendarEventsByDate(monthEvents),
    [monthEvents]
  );

  const cells = monthMatrix(year, month);
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const ym = `${year}년 ${month + 1}월`;

  const prevMonth = () => {
    setSelectedDate(null);
    const previous = shiftCalendarMonth(year, month, -1);
    setYear(previous.year);
    setMonth(previous.month);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    const next = shiftCalendarMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(todayKey);
  };

  return (
    <div>
      {isAdmin && (
        <div className="calendar-mode-tabs" role="group" aria-label="캘린더 표시 범위">
          <button type="button" aria-pressed={mode === "all_confirmed"} className={mode === "all_confirmed" ? "on" : ""} onClick={() => setMode("all_confirmed")}>
            전체 확정
          </button>
          <button type="button" aria-pressed={mode === "mine"} className={mode === "mine" ? "on" : ""} onClick={() => setMode("mine")}>
            내 참여
          </button>
          <button type="button" aria-pressed={mode === "candidates"} className={mode === "candidates" ? "on" : ""} onClick={() => setMode("candidates")}>
            후보 검토
          </button>
        </div>
      )}

      <div className="calendar-controls">
        <div className="row gap-8">
          <button className="btn icon-only sm" onClick={prevMonth} aria-label="이전 달">
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <b aria-live="polite">{ym}</b>
          <button className="btn icon-only sm" onClick={nextMonth} aria-label="다음 달">
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
        <button className="btn sm" onClick={goToday}>오늘</button>
      </div>

      {monthEvents.length === 0 ? (
        <div className="card calendar-empty">
          <CalendarDays size={28} strokeWidth={1.5} />
          <strong>
            {mode === "candidates"
              ? "검토할 후보 일정이 없습니다."
              : mode === "mine"
                ? "이 달의 참여 일정이 없습니다."
                : "이 달의 확정 일정이 없습니다."}
          </strong>
          <span>
            {mode === "mine"
              ? "승인된 프로젝트의 확정·후보 일정이 여기에 표시됩니다."
              : "다른 표시 범위를 선택하거나 월을 이동해보세요."}
          </span>
        </div>
      ) : (
        <>
          <div className="card flush calendar-desktop-view">
            <div className="cal">
              {DOW_FULL.map((day) => <div key={day} className="cal-dow">{day}</div>)}

              {cells.map((cellDate) => {
                const dateStr = `${cellDate.getFullYear()}-${pad2(cellDate.getMonth() + 1)}-${pad2(cellDate.getDate())}`;
                const isCurMonth = cellDate.getMonth() === month;
                const isToday = dateStr === todayKey;
                const events = eventMap[dateStr] ?? [];

                return (
                  <div key={dateStr} className={`cal-cell ${!isCurMonth ? "other" : ""} ${isToday ? "today" : ""}`}>
                    <span className="d">{cellDate.getDate()}</span>
                    {events.slice(0, 3).map((event) => <CalendarEventLink key={event.id} event={event} />)}
                    {events.length > 3 && (
                      <button
                        type="button"
                        className="calendar-more"
                        onClick={() => setSelectedDate(dateStr)}
                        aria-label={`${dateStr} 일정 ${events.length - 3}개 더 보기`}
                      >
                        +{events.length - 3}개 더보기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <CalendarLegend mode={mode} />
          </div>

          {selectedDate && (eventMap[selectedDate]?.length ?? 0) > 0 && (
            <div className="calendar-selected-day card">
              <div className="calendar-agenda-date">{formatAgendaDate(selectedDate)}</div>
              <div className="calendar-agenda-events">
                {eventMap[selectedDate].map((event) => <CalendarAgendaItem key={event.id} event={event} />)}
              </div>
            </div>
          )}

          <div className="calendar-mobile-view" aria-label={`${ym} 일정 목록`}>
            {groupedMonthEvents.map((group) => (
              <section key={group.date} className="calendar-agenda-group">
                <h2 className="calendar-agenda-date">{formatAgendaDate(group.date)}</h2>
                <div className="calendar-agenda-events">
                  {group.events.map((event) => <CalendarAgendaItem key={event.id} event={event} />)}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarEventLink({ event }: { event: CalendarScheduleDate }) {
  return (
    <Link
      href={`/projects/${event.projects.id}`}
      className={`evt ${event.kind === "practice" ? "practice" : "event"} ${event.is_confirmed ? "confirmed" : "candidate"}`}
      title={event.projects.title}
      aria-label={`${event.projects.title}, ${event.kind === "practice" ? "연습" : "본행사"}, ${event.is_confirmed ? "확정" : "후보"}`}
    >
      {event.projects.title}
    </Link>
  );
}

function CalendarAgendaItem({ event }: { event: CalendarScheduleDate }) {
  return (
    <Link href={`/projects/${event.projects.id}`} className="calendar-agenda-item">
      <span className={`calendar-kind-dot ${event.kind === "practice" ? "practice" : "event"}`} />
      <span className="calendar-agenda-copy">
        <strong>{event.projects.title}</strong>
        <span>
          {event.kind === "practice" ? "연습" : "본행사"}
          {event.projects.venue ? ` · ${event.projects.venue}` : ""}
          {event.myVote ? ` · 내 응답 ${VOTE_LABEL[event.myVote] ?? event.myVote}` : ""}
        </span>
      </span>
      <span className={`calendar-state ${event.is_confirmed ? "confirmed" : "candidate"}`}>
        {event.is_confirmed ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
        {event.is_confirmed ? "확정" : "후보"}
      </span>
    </Link>
  );
}

function CalendarLegend({ mode }: { mode: CalendarMode }) {
  const showConfirmed = mode !== "candidates";
  const showCandidates = mode !== "all_confirmed";

  return (
    <div className="calendar-legend">
      <span><i className="calendar-kind-dot event" />본행사</span>
      <span><i className="calendar-kind-dot practice" />연습</span>
      {showConfirmed && (
        <span className="calendar-state confirmed">
          <CheckCircle2 size={12} />확정 일정
        </span>
      )}
      {showCandidates && (
        <span className="calendar-state candidate">
          <Clock3 size={12} />후보 일정
        </span>
      )}
    </div>
  );
}

function formatAgendaDate(date: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00+09:00`));
}
