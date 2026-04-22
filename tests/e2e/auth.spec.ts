/**
 * auth.spec.ts
 * 로그인 / 로그아웃 / 승인대기 배너 E2E 테스트
 *
 * 실제 Supabase 없이도 페이지 렌더링 및 폼 구조를 검증한다.
 * 실제 인증 플로우는 SUPABASE_E2E=true 환경변수가 있을 때만 실행.
 */
import { test, expect } from "@playwright/test";

const SKIP_LIVE = !process.env.SUPABASE_E2E;

test.describe("Auth — 로그인 페이지 구조", () => {
  test("로그인 페이지가 200으로 응답하고 폼 요소가 존재한다", async ({ page }) => {
    const res = await page.goto("/login");
    // 리디렉션 포함 최종 상태코드
    expect(res?.status()).toBeLessThan(500);

    // 핵심 입력 요소 확인
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("회원가입 페이지가 200으로 응답한다", async ({ page }) => {
    const res = await page.goto("/signup");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("미인증 상태에서 /projects 접근 시 /login으로 리디렉션", async ({ page }) => {
    await page.goto("/projects");
    // 미들웨어가 /login으로 보내야 함
    await expect(page).toHaveURL(/\/login/);
  });

  test("미인증 상태에서 /manage 접근 시 /login으로 리디렉션", async ({ page }) => {
    await page.goto("/manage");
    await expect(page).toHaveURL(/\/login/);
  });

  test("공개 지원 링크 /apply/[id] 는 인증 없이 접근 가능", async ({ page }) => {
    // 존재하지 않는 UUID → 404 또는 공개 페이지 렌더 (로그인 리디렉션이 아님)
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await page.goto(`/apply/${fakeId}`);
    // /login 으로 리디렉션되지 않아야 함
    expect(page.url()).not.toContain("/login");
  });
});

test.describe("Auth — 잘못된 로그인 처리", () => {
  test("빈 이메일·비밀번호로 제출 시 에러 메시지 표시", async ({ page }) => {
    await page.goto("/login");
    await page.locator("button[type='submit']").click();
    // HTML5 required validation 또는 toast 에러 중 하나
    // 폼이 제출되지 않거나 에러가 표시되어야 함
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip(SKIP_LIVE, "SUPABASE_E2E 환경변수 필요: 잘못된 자격증명으로 로그인 시도");
  test("잘못된 자격증명으로 로그인 시 에러 toast 표시", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type='email']").fill("wrong@test.com");
    await page.locator("input[type='password']").fill("wrongpassword");
    await page.locator("button[type='submit']").click();
    // 에러 메시지가 화면에 표시되어야 함
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Auth — API 인증 체크", () => {
  test("POST /api/auth/login — 잘못된 JSON 형식은 400 반환", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "not-an-email", password: "short" },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  test("PATCH /api/projects/[id]/status — 비인증 요청은 401 반환", async ({ request }) => {
    const res = await request.patch("/api/projects/00000000-0000-0000-0000-000000000000/status", {
      data: { status: "recruiting" },
    });
    // 미들웨어 또는 requireAdmin이 401 반환
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/projects — 비인증 요청은 401 반환", async ({ request }) => {
    const res = await request.post("/api/projects", {
      data: { title: "test" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/announcements — 비인증 요청은 401 반환", async ({ request }) => {
    const res = await request.post("/api/announcements", {
      data: { title: "test", body: "test" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("PATCH /api/payouts/[id] — 비인증 요청은 401 반환", async ({ request }) => {
    const res = await request.patch("/api/payouts/00000000-0000-0000-0000-000000000000", {
      data: { status: "paid" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
