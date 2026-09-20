import assert from "node:assert/strict";
import test from "node:test";
import { filterFinanceSettlementsByEventDate } from "../../lib/finance-settlement-date-filter.ts";

const settlements = [
  { id: "sep-2026", eventDate: "2026-09-20" },
  { id: "sep-2027", eventDate: "2027-09-20" },
  { id: "oct-2026", eventDate: "2026-10-01" },
  { id: "unknown", eventDate: null },
];

const ids = (rows) => rows.map((row) => row.id);

test("YYYY-MM month filter matches that exact calendar month", () => {
  assert.deepEqual(ids(filterFinanceSettlementsByEventDate(settlements, { month: "2026-09" })), ["sep-2026"]);
});

test("legacy MM month filter remains supported across years", () => {
  assert.deepEqual(ids(filterFinanceSettlementsByEventDate(settlements, { month: "09" })), ["sep-2026", "sep-2027"]);
});

test("year and month filters use an intersection", () => {
  assert.deepEqual(
    ids(filterFinanceSettlementsByEventDate(settlements, { year: "2026", month: "09" })),
    ["sep-2026"]
  );
  assert.deepEqual(ids(filterFinanceSettlementsByEventDate(settlements, { year: "2027", month: "2026-09" })), []);
});

test("unknown dates are retained only when no date filter is requested", () => {
  assert.deepEqual(ids(filterFinanceSettlementsByEventDate(settlements, {})), ["sep-2026", "sep-2027", "oct-2026", "unknown"]);
  assert.deepEqual(ids(filterFinanceSettlementsByEventDate(settlements, { year: "2026" })), ["sep-2026", "oct-2026"]);
});

test("JSON and CSV share the identical event-date policy", () => {
  const filter = { year: "2026", month: "09" };
  const jsonRows = filterFinanceSettlementsByEventDate(settlements, filter);
  const csvRows = filterFinanceSettlementsByEventDate(settlements, filter);
  assert.deepEqual(ids(csvRows), ids(jsonRows));
});
