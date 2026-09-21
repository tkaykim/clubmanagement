import { expect, test, type Page, type Route } from "@playwright/test";

const authState = process.env.FINANCE_UI_AUTH_FILE;
const enabled = Boolean(authState);
const listEndpoint = "**/api/finance/projects**";

type ProjectStatus = "active" | "cancelled";

function project(
  sequence: number,
  overrides: Partial<{
    title: string;
    projectStatus: ProjectStatus;
    budgetAmount: number;
    contractTotalAmount: number;
    receiptExecutedAmount: number;
    receivableAmount: number;
    confirmedGrossAmount: number;
    paymentExecutedAmount: number;
    unpaidAmount: number;
    needsAttention: boolean;
  }> = {}
) {
  const suffix = String(sequence).padStart(3, "0");
  return {
    projectId: `00000000-0000-4000-8000-000000001${suffix}`,
    title: overrides.title ?? `합성 재무 프로젝트 ${sequence}`,
    projectStatus: overrides.projectStatus ?? "active",
    eventDate: `2026-09-${String(10 + sequence).padStart(2, "0")}`,
    clientName: `합성 거래처 ${sequence}`,
    currency: "KRW",
    budgetAmount: overrides.budgetAmount ?? sequence * 100_000,
    contractSupplyAmount: null,
    contractVatAmount: null,
    contractTotalAmount: overrides.contractTotalAmount ?? sequence * 80_000,
    contractAmountBasis: "total_only",
    contractNote: null,
    receiptExecutedAmount: overrides.receiptExecutedAmount ?? sequence * 30_000,
    receivableAmount: overrides.receivableAmount ?? sequence * 50_000,
    confirmedGrossAmount: overrides.confirmedGrossAmount ?? sequence * 20_000,
    paymentExecutedAmount: overrides.paymentExecutedAmount ?? sequence * 7_000,
    unpaidAmount: overrides.unpaidAmount ?? sequence * 13_000,
    allowanceStatus: "confirmed",
    managers: [{
      id: `00000000-0000-4000-8000-000000002${suffix}`,
      userId: "00000000-0000-4000-8000-000000003001",
      crewMemberId: "00000000-0000-4000-8000-000000004001",
      name: "합성 담당자",
      profileImageUrl: null,
      isPrimary: true,
      assignedAt: "2026-09-01T00:00:00.000Z",
    }],
    version: 1,
    needsAttention: overrides.needsAttention ?? false,
  };
}

async function fulfillList(route: Route, data: ReturnType<typeof project>[], nextCursor: string | null = null) {
  if (route.request().method() !== "GET") throw new Error("재무 목록 UI 테스트는 읽기 요청만 허용합니다.");
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data, access: "global", nextCursor }),
  });
}

async function mockSinglePage(page: Page, data: ReturnType<typeof project>[]) {
  const requestedUrls: string[] = [];
  await page.route(listEndpoint, async (route) => {
    requestedUrls.push(route.request().url());
    await fulfillList(route, data);
  });
  return requestedUrls;
}

function visibleProjectTitle(page: Page, title: string) {
  return page.locator(
    ".finance-project-table:visible .finance-project-title strong, .finance-project-cards:visible .finance-project-title strong",
    { hasText: title }
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(widths.scrollWidth, JSON.stringify(widths)).toBeLessThanOrEqual(widths.clientWidth);
  expect(widths.bodyWidth, JSON.stringify(widths)).toBeLessThanOrEqual(widths.clientWidth);
}

test.use({ storageState: authState });

test.describe("finance project list layout", () => {
  test.skip(!enabled, "FINANCE_UI_AUTH_FILE의 권한 있는 storageState가 필요합니다.");

  test("기본 조회는 취소 프로젝트를 제외하고 취소 필터 요청과 배지를 구분한다", async ({ page }) => {
    const active = project(1, { title: "진행 중 합성 프로젝트" });
    const cancelled = project(2, { title: "취소된 합성 프로젝트", projectStatus: "cancelled" });
    const requestedUrls: string[] = [];

    await page.route(listEndpoint, async (route) => {
      const url = new URL(route.request().url());
      requestedUrls.push(url.toString());
      const eventStatus = url.searchParams.get("eventStatus");
      await fulfillList(route, eventStatus === "cancelled" ? [cancelled] : [active]);
    });

    await page.goto("/finance");
    await expect(visibleProjectTitle(page, active.title)).toBeVisible();
    await expect(visibleProjectTitle(page, cancelled.title)).toHaveCount(0);
    expect(new URL(requestedUrls[0]).searchParams.get("eventStatus")).toBe("active");

    await page.getByRole("combobox", { name: "행사 상태" }).selectOption("cancelled");
    await expect(visibleProjectTitle(page, cancelled.title)).toBeVisible();
    await expect(visibleProjectTitle(page, active.title)).toHaveCount(0);
    await expect(page.locator(".finance-project-title:visible .badge.danger", { hasText: "취소" })).toBeVisible();
    await expect.poll(() => requestedUrls.some((value) => new URL(value).searchParams.get("eventStatus") === "cancelled")).toBe(true);
  });

  test("모든 커서 페이지를 합친 뒤 합계와 검색 결과를 표시한다", async ({ page }) => {
    const first = project(1, { title: "첫 페이지 합성 프로젝트", budgetAmount: 100_000 });
    const second = project(2, { title: "둘째 페이지 검색 대상", budgetAmount: 200_000 });
    const requestedUrls: string[] = [];

    await page.route(listEndpoint, async (route) => {
      const url = new URL(route.request().url());
      requestedUrls.push(url.toString());
      if (url.searchParams.get("cursor") === "page-2") await fulfillList(route, [second]);
      else await fulfillList(route, [first], "page-2");
    });

    await page.goto("/finance");
    await expect(visibleProjectTitle(page, second.title)).toBeVisible();
    await expect(page.locator(".finance-summary").filter({ hasText: "총예산" })).toContainText("30만 원");
    expect(requestedUrls.map((value) => new URL(value).searchParams.get("cursor"))).toContain("page-2");

    const search = page.getByRole("textbox", { name: "검색" });
    await search.fill("검색 대상");
    await expect(visibleProjectTitle(page, second.title)).toBeVisible();
    await expect(visibleProjectTitle(page, first.title)).toHaveCount(0);
    await page.getByRole("button", { name: "초기화" }).click();
    await expect(visibleProjectTitle(page, first.title)).toBeVisible();
    await expect(search).toHaveValue("");
  });

  test("목록 제목은 표 위에 있고 금액 보조값은 다음 줄에 놓인다", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await mockSinglePage(page, [project(1)]);
    await page.goto("/finance");

    const section = page.locator(".finance-project-table");
    const title = section.getByRole("heading", { name: "프로젝트 재무" });
    const tableRegion = section.getByRole("region", { name: "프로젝트 재무 표" });
    const table = tableRegion.getByRole("table");
    await expect(section).toBeVisible();
    await expect(title).toBeVisible();
    const titleBox = await title.boundingBox();
    const tableBox = await table.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(tableBox!.y);

    for (const cellIndex of [4, 6]) {
      const cell = table.locator("tbody tr").first().locator("td").nth(cellIndex);
      const primary = cell.locator("strong");
      const secondary = cell.locator("small");
      const primaryBox = await primary.boundingBox();
      const secondaryBox = await secondary.boundingBox();
      expect(primaryBox).not.toBeNull();
      expect(secondaryBox).not.toBeNull();
      expect(secondaryBox!.y).toBeGreaterThanOrEqual(primaryBox!.y + primaryBox!.height - 1);
    }

    await page.screenshot({ path: testInfo.outputPath("finance-list-desktop-synthetic.png"), fullPage: true });
  });

  test("목록은 모바일부터 와이드 화면까지 가로로 넘치지 않는다", async ({ page }, testInfo) => {
    await mockSinglePage(page, [
      project(1, { title: "매우 긴 합성 프로젝트 제목으로 반응형 줄바꿈 검증" }),
      project(2),
    ]);

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/finance");
      await expect(page.locator("h2:visible", { hasText: /^프로젝트 재무$/ })).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
      if (width === 375) {
        const mobileList = page.locator(".finance-project-cards:visible");
        const listTitleBox = await mobileList.getByRole("heading", { name: "프로젝트 재무" }).boundingBox();
        const firstCardBox = await mobileList.locator(".finance-project-card").first().boundingBox();
        expect(listTitleBox).not.toBeNull();
        expect(firstCardBox).not.toBeNull();
        expect(listTitleBox!.y + listTitleBox!.height).toBeLessThanOrEqual(firstCardBox!.y);
        await page.screenshot({ path: testInfo.outputPath("finance-list-mobile-synthetic.png"), fullPage: true });
      }
    }
  });

  test("빈 결과와 API 오류에서 안내 및 다시 시도를 제공한다", async ({ page }) => {
    let calls = 0;
    let failing = true;
    await page.route(listEndpoint, async (route) => {
      calls += 1;
      if (failing) {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "합성 목록 오류" }) });
        return;
      }
      await fulfillList(route, []);
    });

    await page.goto("/finance");
    await expect(page.locator(".finance-state-error[role=alert]")).toContainText("합성 목록 오류");
    failing = false;
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page.getByText("표시할 프로젝트가 없습니다")).toBeVisible();
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
