import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRecruitmentDateTime,
  getRecruitmentWindowState,
  recruitmentWindowMessage,
} from "../../lib/recruitment.ts";

const now = new Date("2026-08-30T03:00:00.000Z");

test("future recruitment window stays closed", () => {
  assert.equal(
    getRecruitmentWindowState(
      {
        status: "recruiting",
        recruitment_start_at: "2026-08-30T04:00:00.000Z",
        recruitment_end_at: "2026-08-31T04:00:00.000Z",
      },
      now
    ),
    "upcoming"
  );
});

test("open recruitment window accepts applications", () => {
  assert.equal(
    getRecruitmentWindowState(
      {
        status: "recruiting",
        recruitment_start_at: "2026-08-30T02:00:00.000Z",
        recruitment_end_at: "2026-08-30T04:00:00.000Z",
      },
      now
    ),
    "open"
  );
});

test("end time is exclusive and closes applications", () => {
  assert.equal(
    getRecruitmentWindowState(
      {
        status: "recruiting",
        recruitment_start_at: null,
        recruitment_end_at: "2026-08-30T03:00:00.000Z",
      },
      now
    ),
    "closed"
  );
});

test("non-recruiting status never accepts new applications", () => {
  assert.equal(
    getRecruitmentWindowState(
      { status: "in_progress", recruitment_start_at: null, recruitment_end_at: null },
      now
    ),
    "unavailable"
  );
});

test("start time is inclusive", () => {
  assert.equal(
    getRecruitmentWindowState(
      { status: "recruiting", recruitment_start_at: now.toISOString(), recruitment_end_at: null },
      now
    ),
    "open"
  );
});

test("recruiting project without bounds stays open", () => {
  assert.equal(
    getRecruitmentWindowState(
      { status: "recruiting", recruitment_start_at: null, recruitment_end_at: null },
      now
    ),
    "open"
  );
});

test("upcoming message contains the formatted opening time", () => {
  const value = "2026-08-30T04:00:00.000Z";
  assert.equal(
    recruitmentWindowMessage("upcoming", { status: "recruiting", recruitment_start_at: value }),
    `${formatRecruitmentDateTime(value)}에 지원이 열립니다.`
  );
});

test("closed and unavailable messages explain why applying is blocked", () => {
  assert.equal(recruitmentWindowMessage("closed", { status: "recruiting" }), "모집이 마감되었습니다.");
  assert.equal(
    recruitmentWindowMessage("unavailable", { status: "in_progress" }),
    "현재 지원을 받지 않는 프로젝트입니다."
  );
  assert.equal(recruitmentWindowMessage("open", { status: "recruiting" }), null);
});
