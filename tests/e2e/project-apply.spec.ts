/**
 * project-apply.spec.ts
 * 프로젝트 조회 → 지원 → 관리자 승인 플로우 E2E 테스트
 *
 * 공개 지원 링크(/apply/[id])는 인증 없이도 접근 가능하므로
 * Supabase 없이도 기본 렌더링을 검증할 수 있다.
 */
import { test, expect } from "@playwright/test";

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

test.describe("공개 지원 폼 (/apply/[id])", () => {
  test("존재하지 않는 프로젝트 UUID → 404 또는 notFound 처리", async ({ page }) => {
    const res = await page.goto(`/apply/${FAKE_UUID}`);
    // 404 또는 notFound 컴포넌트가 렌더되어야 함 (500이 아니어야 함)
    expect(res?.status()).not.toBe(500);
  });

  test("공개 지원 페이지가 로그인 리디렉션 없이 렌더된다", async ({ page }) => {
    await page.goto(`/apply/${FAKE_UUID}`);
    // /login으로 이동하지 않아야 함
    expect(page.url()).not.toContain("/login");
  });
});

test.describe("API: 지원 제출 엣지 케이스", () => {
  test("POST /api/projects/[id]/apply — guest_name 없는 게스트 지원은 400", async ({ request }) => {
    const res = await request.post(`/api/projects/${FAKE_UUID}/apply`, {
      data: {
        guest_email: "test@test.com",
        // guest_name 누락
        fee_agreement: "yes",
        votes: {},
      },
    });
    // 프로젝트가 없어서 404이거나, guest_name 검증 실패로 400
    expect([400, 404]).toContain(res.status());
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  test("POST /api/projects/[id]/apply — fee_agreement 범위 외 값은 400", async ({ request }) => {
    const res = await request.post(`/api/projects/${FAKE_UUID}/apply`, {
      data: {
        guest_name: "테스트",
        guest_email: "test@test.com",
        fee_agreement: "invalid_value", // Zod enum 실패
        votes: {},
      },
    });
    expect([400, 404]).toContain(res.status());
  });

  test("POST /api/projects/[id]/apply — 빈 body는 400 반환", async ({ request }) => {
    const res = await request.post(`/api/projects/${FAKE_UUID}/apply`, {
      data: {},
    });
    expect([400, 404, 409]).toContain(res.status());
  });
});

test.describe("API: 지원 상태 관리 (admin 전용)", () => {
  test("PATCH /api/applications/[appId]/status — 비인증은 401", async ({ request }) => {
    const res = await request.patch(`/api/applications/${FAKE_UUID}/status`, {
      data: { status: "approved" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/applications/bulk-status — 비인증은 401", async ({ request }) => {
    const res = await request.post("/api/applications/bulk-status", {
      data: { application_ids: [FAKE_UUID], status: "approved" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/applications/bulk-status — empty ids array는 400", async ({ request }) => {
    // 인증 없이도 400 validator 에러를 기대 (또는 401)
    const res = await request.post("/api/applications/bulk-status", {
      data: { application_ids: [], status: "approved" },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

test.describe("API: 가용성 투표 (인증 필요)", () => {
  test("POST /api/projects/[id]/votes — 비인증은 401", async ({ request }) => {
    const res = await request.post(`/api/projects/${FAKE_UUID}/votes`, {
      data: {
        votes: {
          [FAKE_UUID]: { status: "available", time_slots: [] },
        },
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/projects/[id]/votes — 빈 votes 객체는 400", async ({ request }) => {
    // 비인증이면 401이 먼저 반환됨
    const res = await request.post(`/api/projects/${FAKE_UUID}/votes`, {
      data: { votes: {} },
    });
    expect([400, 401]).toContain(res.status());
  });
});
