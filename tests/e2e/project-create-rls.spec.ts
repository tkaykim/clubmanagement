import { expect, test } from "@playwright/test";

// Actual Next.js route, with isolated auth/DB HTTP upstream. Live RLS is separately
// verified in rollback-only transactions; never create production fixtures here.
test.describe("project creation with restricted finance access", () => {
  test.skip(process.env.FINANCE_OPERATOR_LOCAL !== "1", "Requires isolated local Supabase stub");
  for (const role of ["admin", "owner"] as const) {
    test(`${role} creates every visibility without gaining finance access`, async ({ page }) => {
      expect((await page.request.post("/api/auth/login", {
        data: { email: `${role}@example.test`, password: "isolated-test-only" },
      })).status()).toBe(200);
      for (const visibility of ["public", "admin", "contract", "private"]) {
        const response = await page.request.post("/api/projects", { data: {
          title: `Synthetic ${visibility} project`, type: "practice", visibility, pay_type: "free",
          dates: [{ date: "2026-10-01" }], practiceDates: [{ date: "2026-09-30" }],
        } });
        expect(response.status(), await response.text()).toBe(201);
        const { data } = await response.json();
        expect(data.visibility).toBe(visibility);
        expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
        expect((await page.request.get(`/api/finance/projects/${data.id}`)).status()).toBe(403);
      }
      const list = await page.request.get("/api/finance/projects");
      expect((await list.json()).data).toEqual([]);
      if (role === "admin") {
        await page.goto("/manage/projects/new");
        await page.getByLabel("제목", { exact: false }).fill("Synthetic form-created project");
        const saved = page.waitForResponse(response =>
          new URL(response.url()).pathname === "/api/projects" && response.request().method() === "POST");
        await page.getByRole("button", { name: "저장", exact: true }).click();
        const response = await saved;
        expect(response.status(), await response.text()).toBe(201);
        const { data } = await response.json();
        await expect(page).toHaveURL(new RegExp(`/manage/projects/${data.id}`));
        await page.screenshot({ path: test.info().outputPath("created-project.png"), fullPage: true });
      }
    });
  }
  test("ordinary members still cannot create projects", async ({ page }) => {
    await page.request.post("/api/auth/login", { data: { email: "member@example.test", password: "isolated-test-only" } });
    const response = await page.request.post("/api/projects", { data: { title: "Denied", type: "practice" } });
    expect(response.status()).toBe(403);
  });
});
