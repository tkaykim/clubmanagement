import assert from "node:assert/strict";
import test from "node:test";
import { createBugReportCommentSchema } from "../../lib/validators.ts";

test("댓글 앞뒤 공백을 정리해 저장한다", () => {
  const result = createBugReportCommentSchema.safeParse({
    body: "  확인했습니다.  ",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.body, "확인했습니다.");
});

test("빈 댓글은 받지 않는다", () => {
  const result = createBugReportCommentSchema.safeParse({ body: "   " });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "댓글 내용을 적어주세요");
});

test("2000자를 넘는 댓글은 받지 않는다", () => {
  const result = createBugReportCommentSchema.safeParse({ body: "가".repeat(2001) });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "댓글은 2000자 이하로 적어주세요");
});
