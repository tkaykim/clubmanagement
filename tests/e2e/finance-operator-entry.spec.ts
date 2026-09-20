import { expect, test } from "@playwright/test";

// Runs only against scripts/test-finance-operator-entry.cjs's isolated auth/DB stub.
// No production accounts, tokens, grants, or financial records are used.
test.describe("finance operator page entry", () => {
  test.skip(process.env.FINANCE_OPERATOR_LOCAL !== "1", "Requires isolated local Supabase stub");

  for (const role of ["admin", "owner", "member"] as const) {
    test(`${role}: entry does not grant project data`, async ({ page }) => {
      const login = await page.request.post("/api/auth/login", {
        data: { email: `${role}@example.test`, password: "isolated-test-only" },
      });
      expect(login.status()).toBe(200);
      const access = await page.request.get("/api/finance/access");
      expect((await access.json()).data).toEqual({
        authenticated: true,
        canAccessFinance: role !== "member",
        isGlobal: false,
        managedProjectIds: [],
      });
      const list = await page.request.get("/api/finance/projects");
      expect(list.status()).toBe(role === "member" ? 403 : 200);
      if (role !== "member") {
        expect(await list.json()).toEqual({ data: [], access: "project_manager", nextCursor: null });
        await page.goto("/finance");
        await expect(page.getByRole("heading", { name: "프로젝트 재무", exact: true })).toBeVisible();
        await expect(page.getByText("표시할 프로젝트가 없습니다")).toBeVisible();
        // Desktop sidebar and mobile drawer both derive their entry from the server identity.
        const menu = page.getByRole("button", { name: "메뉴 열기" });
        if (await menu.isVisible()) await menu.click();
        await expect(page.getByRole("link", { name: "프로젝트 재무", exact: true }).first()).toBeVisible();
        await page.screenshot({ path: test.info().outputPath(`${role}-empty.png`), fullPage: true });
      }
      for (const endpoint of [
        "/api/finance/projects/00000000-0000-4000-8000-000000000099",
        "/api/finance/projects/00000000-0000-4000-8000-000000000099/audit",
        "/api/finance/members",
        "/api/settlements?month=2026-09",
        "/api/settlements/csv?month=2026-09",
      ]) {
        const denied = await page.request.get(endpoint);
        expect(denied.status(), endpoint).toBe(403);
        expect(await denied.text()).not.toContain("PRIVATE_LEDGER_SENTINEL");
      }
    });
  }
});
