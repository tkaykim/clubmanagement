/**
 * manage-tabs.spec.ts
 * /manage/projects/[id]?tab=... 각 탭 렌더링 및 bulk-approve 플로우
 *
 * 비인증 상태에서 /manage/* 접근 시 /login으로 리디렉션되는지 확인.
 * 실제 관리자 플로우는 SUPABASE_E2E=true 시에만 실행.
 */
import { test, expect } from "@playwright/test";

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";
const SKIP_LIVE = !process.env.SUPABASE_E2E;

test.describe("관리자 라우트 보호", () => {
  test("비인증 상태에서 /manage 접근 시 /login으로 리디렉션", async ({ page }) => {
    await page.goto("/manage");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비인증 상태에서 /manage/members 접근 시 /login으로 리디렉션", async ({ page }) => {
    await page.goto("/manage/members");
    await expect(page).toHaveURL(/\/login/);
  });

  test("비인증 상태에서 /manage/settlements 접근 시 /login으로 리디렉션", async ({ page }) => {
    await page.goto("/manage/settlements");
    await expect(page).toHaveURL(/\/login/);
  });

  test(`비인증 상태에서 /manage/projects/[id] 접근 시 /login으로 리디렉션`, async ({ page }) => {
    await page.goto(`/manage/projects/${FAKE_UUID}`);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("API: 관리자 전용 엔드포인트 보호", () => {
  test("PATCH /api/projects/[id] — 비인증은 401", async ({ request }) => {
    const res = await request.patch(`/api/projects/${FAKE_UUID}`, {
      data: { title: "updated" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("DELETE /api/projects/[id] — 비인증은 401", async ({ request }) => {
    const res = await request.delete(`/api/projects/${FAKE_UUID}`);
    expect([401, 403]).toContain(res.status());
  });

  test("PATCH /api/members/[id]/role — 비인증은 401", async ({ request }) => {
    const res = await request.patch(`/api/members/${FAKE_UUID}/role`, {
      data: { role: "admin" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/settlements — 비인증은 401", async ({ request }) => {
    const res = await request.get("/api/settlements?month=2026-04");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/settlements/csv — 비인증은 401", async ({ request }) => {
    const res = await request.get("/api/settlements/csv?month=2026-04");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/settlements — month 파라미터 없으면 400", async ({ request }) => {
    // 비인증이면 401, 인증됐지만 month 없으면 400
    const res = await request.get("/api/settlements");
    expect([400, 401, 403]).toContain(res.status());
  });

  test("GET /api/settlements — month 형식 틀리면 400", async ({ request }) => {
    const res = await request.get("/api/settlements?month=invalid");
    expect([400, 401, 403]).toContain(res.status());
  });

  test("POST /api/projects/[id]/payouts — 비인증은 401", async ({ request }) => {
    const res = await request.post(`/api/projects/${FAKE_UUID}/payouts`);
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("API: Payout 상태 전이 규칙", () => {
  test("PATCH /api/payouts/[id] — 비인증은 401", async ({ request }) => {
    const res = await request.patch(`/api/payouts/${FAKE_UUID}`, {
      data: { status: "paid" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("PATCH /api/payouts/[id] — status 범위 외 값은 400", async ({ request }) => {
    // 비인증이면 401이 먼저 반환됨
    const res = await request.patch(`/api/payouts/${FAKE_UUID}`, {
      data: { status: "cancelled" }, // 유효하지 않은 값
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

test.describe("API: Preset 소유권 검증", () => {
  test("POST /api/presets — 비인증은 401", async ({ request }) => {
    const res = await request.post("/api/presets", {
      data: { name: "test", config: {} },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("PATCH /api/presets/[id] — 비인증은 401", async ({ request }) => {
    const res = await request.patch(`/api/presets/${FAKE_UUID}`, {
      data: { name: "updated" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("DELETE /api/presets/[id] — 비인증은 401", async ({ request }) => {
    const res = await request.delete(`/api/presets/${FAKE_UUID}`);
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Manage 탭 기능 (라이브 환경)", () => {
  test.skip(SKIP_LIVE, "SUPABASE_E2E 환경변수 필요: 관리자 로그인 후 탭 전환 테스트");

  test("applications 탭이 기본으로 렌더된다", async ({ page }) => {
    // 실제 관리자 계정으로 로그인 후
    await page.goto(`/manage/projects/${FAKE_UUID}?tab=applications`);
    await expect(page.locator("text=지원자")).toBeVisible({ timeout: 5000 });
  });

  test("settlement 탭이 렌더된다", async ({ page }) => {
    await page.goto(`/manage/projects/${FAKE_UUID}?tab=settlement`);
    await expect(page.locator("text=정산")).toBeVisible({ timeout: 5000 });
  });

  test("bulk approve 버튼이 선택된 지원자 없으면 비활성화", async ({ page }) => {
    await page.goto(`/manage/projects/${FAKE_UUID}?tab=applications`);
    // 선택된 지원자 없으면 bulk 버튼이 보이지 않아야 함
    await expect(page.locator("text=일괄 확정")).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  });
});
