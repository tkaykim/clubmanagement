import assert from "node:assert/strict";
import test from "node:test";
import {
  filterCalendarDatesForMode,
  getCalendarMonthEvents,
  groupCalendarEventsByDate,
  prepareCalendarScheduleDates,
  shiftCalendarMonth,
} from "../../lib/calendar.ts";

const project = (id, status = "recruiting", title = id) => ({
  id,
  title,
  type: "paid_gig",
  venue: null,
  status,
});

const raw = (id, projectRef, confirmed = true, date = "2026-08-30") => ({
  id,
  date,
  label: null,
  kind: "event",
  is_confirmed: confirmed,
  projects: projectRef,
});

const prepared = (id, confirmed, mine, date = "2026-08-30", title = id) => ({
  ...raw(id, project(id, "recruiting", title), confirmed, date),
  isMine: mine,
  myVote: null,
});

test("cancelled and orphaned projects never enter the calendar", () => {
  const rows = [raw("cancelled", project("p1", "cancelled")), raw("orphan", null)];
  assert.deepEqual(prepareCalendarScheduleDates(rows, true, new Set(), new Map()), []);
});

test("members receive confirmed and candidate dates from approved projects", () => {
  const rows = [
    raw("mine-confirmed", project("mine"), true),
    raw("mine-candidate", project("mine"), false),
    raw("other-confirmed", project("other"), true),
  ];
  assert.deepEqual(
    prepareCalendarScheduleDates(rows, false, new Set(["mine"]), new Map()).map((row) => row.id),
    ["mine-confirmed", "mine-candidate"]
  );
});

test("admins receive confirmed and candidate dates from active projects", () => {
  const rows = [raw("confirmed", project("p1"), true), raw("candidate", project("p2"), false)];
  assert.deepEqual(
    prepareCalendarScheduleDates(rows, true, new Set(), new Map()).map((row) => row.id),
    ["confirmed", "candidate"]
  );
});

test("prepared dates include participation and vote context", () => {
  const [row] = prepareCalendarScheduleDates(
    [raw("date-1", project("mine"), true)],
    true,
    new Set(["mine"]),
    new Map([["date-1", "available"]])
  );
  assert.equal(row.isMine, true);
  assert.equal(row.myVote, "available");
});

test("candidate mode only shows unconfirmed dates", () => {
  const rows = [prepared("confirmed", true, false), prepared("candidate", false, false)];
  assert.deepEqual(filterCalendarDatesForMode(rows, "candidates").map((row) => row.id), ["candidate"]);
});

test("mine mode shows confirmed and candidate dates in my projects", () => {
  const rows = [
    prepared("mine", true, true),
    prepared("other", true, false),
    prepared("candidate", false, true),
  ];
  assert.deepEqual(filterCalendarDatesForMode(rows, "mine").map((row) => row.id), ["mine", "candidate"]);
});

test("all confirmed mode excludes candidates", () => {
  const rows = [prepared("confirmed", true, false), prepared("candidate", false, true)];
  assert.deepEqual(filterCalendarDatesForMode(rows, "all_confirmed").map((row) => row.id), ["confirmed"]);
});

test("month events filter outside dates and sort by date then title", () => {
  const rows = [
    prepared("b", true, false, "2026-08-30", "Bravo"),
    prepared("a", true, false, "2026-08-30", "Alpha"),
    prepared("earlier", true, false, "2026-08-01", "Earlier"),
    prepared("outside", true, false, "2026-09-01", "Outside"),
  ];
  assert.deepEqual(getCalendarMonthEvents(rows, 2026, 7).map((row) => row.id), ["earlier", "a", "b"]);
});

test("month events group adjacent sorted dates", () => {
  const rows = [
    prepared("a", true, false, "2026-08-01"),
    prepared("b", true, false, "2026-08-01"),
    prepared("c", true, false, "2026-08-02"),
  ];
  assert.deepEqual(
    groupCalendarEventsByDate(rows).map((group) => [group.date, group.events.map((row) => row.id)]),
    [["2026-08-01", ["a", "b"]], ["2026-08-02", ["c"]]]
  );
});

test("previous month crosses January into the prior year", () => {
  assert.deepEqual(shiftCalendarMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test("next month crosses December into the following year", () => {
  assert.deepEqual(shiftCalendarMonth(2026, 11, 1), { year: 2027, month: 0 });
});

test("ordinary month navigation keeps the year", () => {
  assert.deepEqual(shiftCalendarMonth(2026, 7, 1), { year: 2026, month: 8 });
});
