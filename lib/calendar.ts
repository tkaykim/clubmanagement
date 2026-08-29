export type CalendarMode = "mine" | "all_confirmed" | "candidates";

export interface CalendarProjectRef {
  id: string;
  title: string;
  type: string;
  venue: string | null;
  status: string;
}

export interface RawCalendarScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
  is_confirmed: boolean;
  projects: CalendarProjectRef | null;
}

export interface CalendarScheduleDate extends Omit<RawCalendarScheduleDate, "projects"> {
  projects: CalendarProjectRef;
  isMine: boolean;
  myVote: string | null;
}

export function prepareCalendarScheduleDates(
  rows: RawCalendarScheduleDate[],
  isAdmin: boolean,
  myProjectIds: ReadonlySet<string>,
  voteMap: ReadonlyMap<string, string>
): CalendarScheduleDate[] {
  return rows
    .filter(
      (row): row is RawCalendarScheduleDate & { projects: CalendarProjectRef } =>
        row.projects !== null && row.projects.status !== "cancelled"
    )
    .filter((row) => isAdmin || myProjectIds.has(row.projects.id))
    .map((row) => ({
      ...row,
      isMine: myProjectIds.has(row.projects.id),
      myVote: voteMap.get(row.id) ?? null,
    }));
}

export function filterCalendarDatesForMode(
  rows: CalendarScheduleDate[],
  mode: CalendarMode
): CalendarScheduleDate[] {
  return rows.filter((row) => {
    if (mode === "candidates") return !row.is_confirmed;
    if (mode === "mine") return row.isMine;
    return row.is_confirmed;
  });
}

export function getCalendarMonthEvents(
  rows: CalendarScheduleDate[],
  year: number,
  month: number
): CalendarScheduleDate[] {
  return rows
    .filter((row) => {
      const [rowYear, rowMonth] = row.date.split("-").map(Number);
      return rowYear === year && rowMonth === month + 1;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.projects.title.localeCompare(b.projects.title)
    );
}

export function groupCalendarEventsByDate(
  rows: CalendarScheduleDate[]
): Array<{ date: string; events: CalendarScheduleDate[] }> {
  const groups: Array<{ date: string; events: CalendarScheduleDate[] }> = [];
  for (const event of rows) {
    const last = groups.at(-1);
    if (last?.date === event.date) last.events.push(event);
    else groups.push({ date: event.date, events: [event] });
  }
  return groups;
}

export function shiftCalendarMonth(
  year: number,
  month: number,
  delta: -1 | 1
): { year: number; month: number } {
  if (month === 0 && delta === -1) return { year: year - 1, month: 11 };
  if (month === 11 && delta === 1) return { year: year + 1, month: 0 };
  return { year, month: month + delta };
}
