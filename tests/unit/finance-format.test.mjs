import assert from "node:assert/strict";
import test from "node:test";
import { formatDate } from "../../components/finance/format.ts";

test("finance dates retain the Korean transaction day in UTC server rendering", () => {
  assert.equal(formatDate("2026-09-20T00:00:00+09:00"), formatDate("2026-09-20"));
  assert.equal(formatDate("2026-09-19T15:00:00Z"), formatDate("2026-09-20"));
  assert.equal(formatDate(null), "미정");
});
