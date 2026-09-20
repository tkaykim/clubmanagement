import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

type AccountKey =
  | "ceo"
  | "finance"
  | "manager"
  | "co_manager"
  | "admin"
  | "owner"
  | "member"
  | "other";

type Account = { userId: string; email: string; password: string; crewMemberId?: string | null };
type Fixture = {
  month: string;
  projects: {
    primary: { id: string; budgetAmount: number };
    secondary: { id: string; budgetAmount: number };
  };
  allowances: {
    member: { grossAmount: number };
    other: { grossAmount: number };
  };
  users: Record<AccountKey, Account & { crewMemberId?: string | null }>;
};

// The private launcher deliberately provides only the fixture path.
// Keep an explicit opt-in for ordinary local runs while making that launcher usable.
const enabled = process.env.FINANCE_E2E === "1" || Boolean(process.env.FINANCE_E2E_FIXTURE_PATH);

function loadFixture(): Fixture {
  const fixturePath = process.env.FINANCE_E2E_FIXTURE_PATH;
  if (!fixturePath) throw new Error("FINANCE_E2E_FIXTURE_PATH가 필요합니다");
  const raw = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as
    Omit<Fixture, "users"> & {
      users: Record<AccountKey, Omit<Account, "userId"> & { id?: string; userId?: string }>;
    };
  const fixture = {
    ...raw,
    users: Object.fromEntries(
      Object.entries(raw.users ?? {}).map(([key, account]) => [
        key,
        { ...account, userId: account.userId ?? account.id ?? "" },
      ])
    ),
  } as Fixture;
  const accounts: AccountKey[] = [
    "ceo",
    "finance",
    "manager",
    "co_manager",
    "admin",
    "owner",
    "member",
    "other",
  ];
  for (const key of accounts) {
    const account = fixture.users?.[key];
    if (!account?.userId || !account.email || !account.password || account.password === "replace-me") {
      throw new Error(`finance E2E fixture의 ${key} 계정이 완성되지 않았습니다`);
    }
  }
  if (!/^\d{4}-\d{2}$/.test(fixture.month)) {
    throw new Error("finance E2E fixture month는 YYYY-MM 형식이어야 합니다");
  }
  return fixture;
}

function supabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error("Supabase URL과 anon/publishable key가 필요합니다");
  return { url, key };
}

async function dbAs(account: Account): Promise<SupabaseClient> {
  const { url, key } = supabaseConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (error || !data.user) throw new Error("합성 계정 로그인에 실패했습니다");
  expect(data.user.id).toBe(account.userId);
  return client;
}

async function loginBrowser(page: Page, account: Account): Promise<void> {
  const response = await page.request.post("/api/auth/login", {
    data: { email: account.email, password: account.password },
  });
  expect(response.status()).toBe(200);
}

type ConcurrentRequestDiagnostic = {
  request: number;
  outcome: "response" | "rejected";
  elapsedMs: number;
  status?: number;
  code?: string;
  error?: string;
};

async function browserConcurrentDrafts(
  page: Page,
  path: string,
  payload: unknown
): Promise<ConcurrentRequestDiagnostic[]> {
  // This runs in Chromium itself, so it exercises the same cookie and transport
  // behavior a manager uses in two simultaneous UI actions.
  if (page.url() === "about:blank") {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }
  return page.evaluate(async ({ path: requestPath, input }) => {
    const one = async (request: number) => {
      const startedAt = performance.now();
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch(requestPath, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        let body: Record<string, unknown> | null = null;
        try {
          body = (await response.json()) as Record<string, unknown>;
        } catch {
          // Keep the status/timing diagnostic even when a proxy returns non-JSON.
        }
        return {
          request,
          outcome: "response" as const,
          elapsedMs: Math.round(performance.now() - startedAt),
          status: response.status,
          ...(typeof body?.code === "string" ? { code: body.code } : {}),
          ...(typeof body?.error === "string" ? { error: body.error } : {}),
        };
      } catch (error) {
        return {
          request,
          outcome: "rejected" as const,
          elapsedMs: Math.round(performance.now() - startedAt),
          error: error instanceof Error ? error.name : "unknown",
        };
      } finally {
        window.clearTimeout(timeout);
      }
    };
    return Promise.all([one(1), one(2)]);
  }, { path, input: payload });
}

function expectNoPrivateMarkers(text: string, fixture: Fixture, allowed: number[] = []): void {
  const markers = [
    fixture.projects.primary.budgetAmount,
    fixture.projects.secondary.budgetAmount,
    fixture.allowances.member.grossAmount,
    fixture.allowances.other.grossAmount,
  ].filter((value) => !allowed.includes(value));
  for (const marker of markers) expect(text).not.toContain(String(marker));
}

test.describe("finance privacy boundaries — live Supabase and browser", () => {
  test.skip(!enabled, "FINANCE_E2E=1 및 비공개 fixture가 필요합니다");
  test.describe.configure({ mode: "serial" });

  let fixture: Fixture;

  test.beforeAll(() => {
    fixture = loadFixture();
  });

  test("Data API RLS: global, project manager, unassigned admin, participant scopes", async () => {
    const expectations: Array<{
      key: AccountKey;
      allowedProjects: string[];
    }> = [
      { key: "ceo", allowedProjects: [fixture.projects.primary.id, fixture.projects.secondary.id] },
      { key: "finance", allowedProjects: [fixture.projects.primary.id, fixture.projects.secondary.id] },
      { key: "manager", allowedProjects: [fixture.projects.primary.id] },
      { key: "co_manager", allowedProjects: [fixture.projects.secondary.id] },
      { key: "admin", allowedProjects: [] },
      { key: "owner", allowedProjects: [] },
      { key: "member", allowedProjects: [] },
      { key: "other", allowedProjects: [] },
    ];

    for (const item of expectations) {
      const client = await dbAs(fixture.users[item.key]);
      const { data, error } = await client
        .from("project_finance")
        .select("project_id,budget_amount");
      expect(error).toBeNull();
      const rows = (data ?? []) as Array<{ project_id: string; budget_amount: number | null }>;
      const visibleFixtureProjects = rows
        .map((row) => row.project_id)
        .filter((id) => id === fixture.projects.primary.id || id === fixture.projects.secondary.id)
        .sort();
      expect(visibleFixtureProjects).toEqual(item.allowedProjects.slice().sort());
      await client.auth.signOut();
    }
  });

  test("Data API RLS: participants cannot read budgets or a colleague's allowance", async () => {
    for (const key of ["member", "other"] as const) {
      const client = await dbAs(fixture.users[key]);
      const [{ data: budgets, error: budgetError }, { data: items, error: itemError }] =
        await Promise.all([
          client.from("project_finance").select("project_id,budget_amount"),
          client
            .from("finance_allowance_items")
            .select("recipient_user_id,gross_amount"),
        ]);
      expect(budgetError).toBeNull();
      expect(budgets ?? []).toHaveLength(0);
      expect(itemError).toBeNull();
      const ownUserId = fixture.users[key].userId;
      expect(
        ((items ?? []) as Array<{ recipient_user_id: string }>).every(
          (row) => row.recipient_user_id === ownUserId
        )
      ).toBe(true);
      const serialized = JSON.stringify(items ?? []);
      const ownAmount = fixture.allowances[key].grossAmount;
      const colleagueAmount =
        key === "member"
          ? fixture.allowances.other.grossAmount
          : fixture.allowances.member.grossAmount;
      expect(serialized).toContain(String(ownAmount));
      expect(serialized).not.toContain(String(colleagueAmount));
      await client.auth.signOut();
    }
  });

  test("Data API RLS: an ordinary admin cannot self-grant global finance access", async () => {
    const client = await dbAs(fixture.users.admin);
    const { error } = await client.from("finance_access_grants").insert({
      user_id: fixture.users.admin.userId,
      role: "finance",
      reason: "E2E unauthorized self grant",
    });
    expect(error).not.toBeNull();

    const { data: isGlobal, error: rpcError } = await client.rpc("finance_is_global", {
      p_user_id: fixture.users.admin.userId,
    });
    expect(rpcError).toBeNull();
    expect(isGlobal).toBe(false);
    await client.auth.signOut();
  });

  test("browser/API: finance-only staff can resolve names without contact details", async ({ page }) => {
    await loginBrowser(page, fixture.users.finance);
    const membersResponse = await page.request.get("/api/finance/members");
    expect(membersResponse.status()).toBe(200);
    const members = (await membersResponse.json()).data;
    expect(members.some((member: { userId: string }) => member.userId === fixture.users.manager.userId)).toBe(true);
    for (const member of members) {
      expect(Object.keys(member).sort()).toEqual(["crewMemberId", "name", "profileImageUrl", "userId"].sort());
    }
    const response = await page.request.get(`/api/finance/projects/${fixture.projects.primary.id}`);
    expect(response.status()).toBe(200);
    const detail = (await response.json()).data;
    expect(detail.managers.length).toBeGreaterThan(0);
    expect(detail.managers[0].name).not.toBe("멤버");
    expect(detail.allowances[0].recipientName).not.toBe("멤버");
  });

  test("Data API RLS: legacy payouts are self or explicit finance-management scope only", async () => {
    const cases: Array<{
      key: AccountKey;
      allowedProjectIds: string[];
      selfOnly?: boolean;
    }> = [
      { key: "ceo", allowedProjectIds: [fixture.projects.primary.id, fixture.projects.secondary.id] },
      { key: "finance", allowedProjectIds: [fixture.projects.primary.id, fixture.projects.secondary.id] },
      { key: "manager", allowedProjectIds: [fixture.projects.primary.id] },
      { key: "co_manager", allowedProjectIds: [fixture.projects.secondary.id] },
      { key: "admin", allowedProjectIds: [], selfOnly: true },
      { key: "owner", allowedProjectIds: [], selfOnly: true },
      { key: "member", allowedProjectIds: [], selfOnly: true },
      { key: "other", allowedProjectIds: [], selfOnly: true },
    ];

    for (const item of cases) {
      const client = await dbAs(fixture.users[item.key]);
      const { data, error } = await client
        .from("payouts")
        .select("id,project_id,user_id,amount");
      expect(error).toBeNull();
      const rows = (data ?? []) as Array<{
        project_id: string;
        user_id: string | null;
      }>;
      const fixtureRows = rows.filter(
        (row) =>
          row.project_id === fixture.projects.primary.id ||
          row.project_id === fixture.projects.secondary.id
      );
      if (item.selfOnly) {
        expect(
          fixtureRows.every((row) => row.user_id === fixture.users[item.key].userId)
        ).toBe(true);
      } else {
        expect(
          fixtureRows.every(
            (row) =>
              item.allowedProjectIds.includes(row.project_id) ||
              row.user_id === fixture.users[item.key].userId
          )
        ).toBe(true);
      }
      await client.auth.signOut();
    }
  });

  test("browser/API: an unassigned admin receives no finance or legacy settlement data", async ({ page }) => {
    await loginBrowser(page, fixture.users.admin);

    const projectsResponse = await page.request.get("/api/finance/projects");
    expect(projectsResponse.status()).toBe(200);
    expect(await projectsResponse.json()).toEqual({ data: [], access: "project_manager", nextCursor: null });
    expectNoPrivateMarkers(await projectsResponse.text(), fixture);

    const accessResponse = await page.request.get("/api/finance/access");
    expect((await accessResponse.json()).data).toMatchObject({
      canAccessFinance: true, isGlobal: false, managedProjectIds: [],
    });
    await page.goto("/finance");
    await expect(page.getByRole("heading", { name: "프로젝트 재무", exact: true })).toBeVisible();
    await expect(page.getByText("표시할 프로젝트가 없습니다")).toBeVisible();
    const detailResponse = await page.request.get(`/api/finance/projects/${fixture.projects.primary.id}`);
    expect(detailResponse.status()).toBe(403);
    expectNoPrivateMarkers(await detailResponse.text(), fixture);

    const settlementsResponse = await page.request.get(
      `/api/settlements?month=${fixture.month}`
    );
    expect(settlementsResponse.status()).toBe(403);
    expectNoPrivateMarkers(await settlementsResponse.text(), fixture);

    const csvResponse = await page.request.get(
      `/api/settlements/csv?month=${fixture.month}`
    );
    expect(csvResponse.status()).toBe(403);
    expectNoPrivateMarkers(await csvResponse.text(), fixture);

    const uiResponse = await page.goto("/manage/settlements");
    expect(uiResponse?.status()).toBe(404);
    expectNoPrivateMarkers(await page.locator("body").innerText(), fixture);
  });

  test("browser/API: manager A cannot switch the project id to read project B", async ({ page }) => {
    await loginBrowser(page, fixture.users.manager);

    const ownResponse = await page.request.get(
      `/api/finance/projects/${fixture.projects.primary.id}`
    );
    expect(ownResponse.status()).toBe(200);
    const ownText = await ownResponse.text();
    expect(ownText).toContain(String(fixture.projects.primary.budgetAmount));
    expectNoPrivateMarkers(ownText, fixture, [
      fixture.projects.primary.budgetAmount,
      fixture.allowances.member.grossAmount,
    ]);

    const otherResponse = await page.request.get(
      `/api/finance/projects/${fixture.projects.secondary.id}`
    );
    expect([403, 404]).toContain(otherResponse.status());
    expectNoPrivateMarkers(await otherResponse.text(), fixture);
  });

  test("browser/API: participant sees only own confirmed settlement", async ({ page }) => {
    await loginBrowser(page, fixture.users.member);

    const projectsResponse = await page.request.get("/api/finance/projects");
    expect(projectsResponse.status()).toBe(403);

    const response = await page.request.get("/api/finance/my-settlements");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain(String(fixture.allowances.member.grossAmount));
    expectNoPrivateMarkers(text, fixture, [fixture.allowances.member.grossAmount]);

    const personalCsv = await page.request.get("/api/finance/my-settlements/csv");
    expect(personalCsv.status()).toBe(200);
    expect(await personalCsv.text()).toContain(String(fixture.allowances.member.grossAmount));
    for (const period of ["year=9999", "month=9999-12"]) {
      const filtered = await page.request.get(`/api/finance/my-settlements?${period}`);
      expect(filtered.status()).toBe(200);
      expect((await filtered.json()).data).toEqual([]);
      const filteredCsv = await page.request.get(`/api/finance/my-settlements/csv?${period}`);
      expect(filteredCsv.status()).toBe(200);
      expect(await filteredCsv.text()).not.toContain(String(fixture.allowances.member.grossAmount));
    }
    await page.goto("/my-settlements");
    await page.locator(".finance-my-filters select").selectOption("");
    await expect(page.locator(".finance-settlement-card").first()).toBeVisible();
    expectNoPrivateMarkers(await page.locator("body").innerText(), fixture, [fixture.allowances.member.grossAmount]);
  });

  test("browser/API: legacy payout mutation endpoints remain disabled for authorized users", async ({ page }) => {
    await loginBrowser(page, fixture.users.ceo);
    const fakeId = "00000000-0000-4000-8000-000000000099";

    const createResponse = await page.request.post(
      `/api/projects/${fixture.projects.primary.id}/payouts`
    );
    expect(createResponse.status()).toBe(410);
    expect(await createResponse.json()).toMatchObject({
      code: "LEGACY_PAYOUT_CREATION_DISABLED",
    });

    const updateResponse = await page.request.patch(`/api/payouts/${fakeId}`, {
      data: { status: "paid" },
    });
    expect(updateResponse.status()).toBe(410);
    expect(await updateResponse.json()).toMatchObject({
      code: "LEGACY_PAYOUT_MUTATION_DISABLED",
    });
  });

  test("browser SSR: old project management page contains no settlement tab or private markers", async ({ page }) => {
    await loginBrowser(page, fixture.users.admin);
    const response = await page.goto(`/manage/projects/${fixture.projects.primary.id}`);
    // An unrelated operational admin has neither project-management nor finance access.
    expect(response?.status()).toBe(404);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("총 정산");
    expect(body).not.toContain("지급 완료");
    expectNoPrivateMarkers(body, fixture);
  });

  test("live mutation boundary: concurrent drafts, submit, confirm, payment evidence, budget cap, and immediate revocation", async ({ page }) => {
    test.setTimeout(90_000);
    const projectId = fixture.projects.primary.id;
    const memberId = fixture.users.member.userId;
    const draftAmount = 200111;

    await loginBrowser(page, fixture.users.manager);
    const beforeResponse = await page.request.get(`/api/finance/projects/${projectId}`);
    expect(beforeResponse.status()).toBe(200);
    const before = (await beforeResponse.json()).data as {
      version: number;
      allowanceRevision: number | null;
      allowanceStatus: string | null;
    };
    expect(before.allowanceRevision).not.toBeNull();

    const draftPayload = {
      expectedRevision: null,
      reason: "E2E concurrent draft boundary",
      items: [
        {
          recipientUserId: memberId,
          category: "synthetic",
          reason: "E2E revised allowance",
          grossAmount: draftAmount,
          taxType: "none",
          evidenceRef: "e2e://allowance/revision",
        },
      ],
    };
    expect(before.allowanceStatus).not.toBe("draft");
    const draftDiagnostics = await browserConcurrentDrafts(
      page,
      `/api/finance/projects/${projectId}/allowances`,
      draftPayload
    );
    const draftStatuses = draftDiagnostics.map((result) => result.status).sort();
    if (JSON.stringify(draftStatuses) !== JSON.stringify([200, 409])) {
      throw new Error(`Concurrent allowance draft diagnostics: ${JSON.stringify(draftDiagnostics)}`);
    }

    const draftedResponse = await page.request.get(`/api/finance/projects/${projectId}`);
    expect(draftedResponse.status()).toBe(200);
    const drafted = (await draftedResponse.json()).data as {
      allowanceRevision: number;
      allowances: Array<{ id: string; grossAmount: number | null }>;
    };
    expect(drafted.allowances).toEqual(
      expect.arrayContaining([expect.objectContaining({ grossAmount: draftAmount })])
    );

    // An already-confirmed recipient must keep seeing the prior confirmed amount while
    // a manager is revising a separate working draft.
    await loginBrowser(page, fixture.users.member);
    const duringRevision = await page.request.get("/api/finance/my-settlements");
    expect(duringRevision.status()).toBe(200);
    expect(await duringRevision.text()).toContain(String(fixture.allowances.member.grossAmount));

    await loginBrowser(page, fixture.users.manager);
    const submit = await page.request.post(`/api/finance/projects/${projectId}/allowances/submit`, {
      data: { expectedRevision: drafted.allowanceRevision, reason: "E2E submit" },
    });
    expect(submit.status()).toBe(200);
    const submitted = (await submit.json()).data as { allowanceRevision: number };

    // Project managers may prepare a batch, but cannot self-confirm it.
    const managerConfirm = await page.request.post(
      `/api/finance/projects/${projectId}/allowances/confirm`,
      { data: { expectedRevision: submitted.allowanceRevision, reason: "E2E forbidden confirm" } }
    );
    expect(managerConfirm.status()).toBe(403);

    await loginBrowser(page, fixture.users.finance);
    const confirmedResponse = await page.request.post(
      `/api/finance/projects/${projectId}/allowances/confirm`,
      { data: { expectedRevision: submitted.allowanceRevision, reason: "E2E global confirmation" } }
    );
    expect(confirmedResponse.status()).toBe(200);
    const confirmed = (await confirmedResponse.json()).data as {
      allowanceRevision: number;
      allowances: Array<{ id: string; recipientUserId: string; grossAmount: number | null; netAmount: number | null }>;
    };
    const confirmedItem = confirmed.allowances.find((item) => item.recipientUserId === memberId);
    expect(confirmedItem).toMatchObject({ grossAmount: draftAmount, netAmount: draftAmount });
    expect(confirmedItem?.id).toBeTruthy();

    await loginBrowser(page, fixture.users.member);
    const afterConfirmation = await page.request.get("/api/finance/my-settlements");
    expect(afterConfirmation.status()).toBe(200);
    const afterConfirmationText = await afterConfirmation.text();
    expect(afterConfirmationText).toContain(String(draftAmount));
    expect(afterConfirmationText).not.toContain(String(fixture.allowances.other.grossAmount));

    // Use the other synthetic project so this budget-cap assertion stays independent
    // of the primary project's subsequent paid-history test.
    const budgetProjectId = fixture.projects.secondary.id;
    await loginBrowser(page, fixture.users.co_manager);
    const excessiveDraft = await page.request.put(`/api/finance/projects/${budgetProjectId}/allowances`, {
      data: {
        expectedRevision: null,
        reason: "E2E budget cap",
        items: [{
          ...draftPayload.items[0],
          recipientUserId: fixture.users.other.userId,
          grossAmount: fixture.projects.secondary.budgetAmount + 1,
        }],
      },
    });
    expect(excessiveDraft.status()).toBe(200);
    const excessive = (await excessiveDraft.json()).data as { allowanceRevision: number };
    const excessiveSubmit = await page.request.post(`/api/finance/projects/${budgetProjectId}/allowances/submit`, {
      data: { expectedRevision: excessive.allowanceRevision, reason: "E2E budget cap submit" },
    });
    expect(excessiveSubmit.status()).toBe(200);
    const excessiveSubmitted = (await excessiveSubmit.json()).data as { allowanceRevision: number };

    await loginBrowser(page, fixture.users.finance);
    const budgetExceeded = await page.request.post(`/api/finance/projects/${budgetProjectId}/allowances/confirm`, {
      data: { expectedRevision: excessiveSubmitted.allowanceRevision, reason: "E2E budget cap confirm" },
    });
    expect(budgetExceeded.status()).toBe(409);
    expect(await budgetExceeded.json()).toMatchObject({ code: "BUDGET_EXCEEDED" });

    const paymentBase = {
      idempotencyKey: `e2e-payment-${Date.now()}`,
      sourceSystem: "finance-e2e",
      sourceAccountRef: "synthetic-private-account",
      sourceTransactionId: `synthetic-payment-${Date.now()}`,
      amount: 100000,
      currency: "KRW",
      paidAt: new Date().toISOString(),
      recipientUserId: memberId,
      status: "executed",
      allocations: [{ allowanceItemId: confirmedItem!.id, amount: 100000 }],
    };
    const missingEvidence = await page.request.post(`/api/finance/projects/${projectId}/payments`, {
      data: paymentBase,
    });
    expect(missingEvidence.status()).toBe(400);

    const paidPayload = { ...paymentBase, evidenceRef: "e2e://payment/partial" };
    const firstPayment = await page.request.post(`/api/finance/projects/${projectId}/payments`, {
      data: paidPayload,
    });
    expect(firstPayment.status()).toBe(200);
    const repeatedPayment = await page.request.post(`/api/finance/projects/${projectId}/payments`, {
      data: paidPayload,
    });
    expect(repeatedPayment.status()).toBe(200);
    const mismatchedIdempotency = await page.request.post(`/api/finance/projects/${projectId}/payments`, {
      data: { ...paidPayload, amount: 100001, allocations: [{ allowanceItemId: confirmedItem!.id, amount: 100001 }] },
    });
    expect(mismatchedIdempotency.status()).toBe(409);

    const finalPayment = await page.request.post(`/api/finance/projects/${projectId}/payments`, {
      data: {
        ...paidPayload,
        idempotencyKey: `${paidPayload.idempotencyKey}-final`,
        sourceTransactionId: `${paidPayload.sourceTransactionId}-final`,
        amount: draftAmount - 100000,
        evidenceRef: "e2e://payment/final",
        allocations: [{ allowanceItemId: confirmedItem!.id, amount: draftAmount - 100000 }],
      },
    });
    expect(finalPayment.status()).toBe(200);

    const paidDetailResponse = await page.request.get(`/api/finance/projects/${projectId}`);
    const paidDetail = (await paidDetailResponse.json()).data as {
      allowances: Array<{ id: string; paidAmount: number; outstandingAmount: number; paymentStatus: string }>;
      version: number;
    };
    expect(paidDetail.allowances.find((item) => item.id === confirmedItem!.id)).toMatchObject({
      paidAmount: draftAmount,
      outstandingAmount: 0,
      paymentStatus: "paid",
    });

    // Revocation must take effect without waiting for a new session.
    const revoke = await page.request.put(`/api/finance/projects/${projectId}/managers`, {
      data: { expectedVersion: paidDetail.version, managers: [], reason: "E2E immediate revocation" },
    });
    expect(revoke.status()).toBe(200);
    await loginBrowser(page, fixture.users.manager);
    const revokedRead = await page.request.get(`/api/finance/projects/${projectId}`);
    expect(revokedRead.status()).toBe(403);
    expectNoPrivateMarkers(await revokedRead.text(), fixture);
  });
});
