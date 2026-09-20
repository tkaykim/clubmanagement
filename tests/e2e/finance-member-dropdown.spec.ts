import { expect, test, type Page } from "@playwright/test";

const authState = process.env.FINANCE_UI_AUTH_FILE;
const enabled = Boolean(authState);
const projectId = "00000000-0000-4000-8000-000000000101";

const members = [
  { crewMemberId: "00000000-0000-4000-8000-000000000201", userId: "00000000-0000-4000-8000-000000000301", name: "김하늘" },
  { crewMemberId: "00000000-0000-4000-8000-000000000202", userId: "00000000-0000-4000-8000-000000000302", name: "박바다" },
  { crewMemberId: "00000000-0000-4000-8000-000000000203", userId: "00000000-0000-4000-8000-000000000303", name: "이별빛" },
];

function financeDetail(access: "global" | "project_manager" | "member" = "global", readOnly = false) {
  return {
    projectId,
    title: "검색 드롭다운 UI 확인 프로젝트",
    eventDate: "2026-09-20",
    clientName: "테스트 거래처",
    currency: "KRW",
    budgetAmount: 100000,
    contractSupplyAmount: null,
    contractVatAmount: null,
    contractTotalAmount: null,
    contractAmountBasis: "undecided",
    contractNote: null,
    receiptExecutedAmount: 0,
    receivableAmount: 100000,
    confirmedGrossAmount: readOnly ? 50000 : 0,
    paymentExecutedAmount: readOnly ? 50000 : 0,
    unpaidAmount: 0,
    allowanceStatus: readOnly ? "confirmed" : "draft",
    managers: [{ id: "00000000-0000-4000-8000-000000000401", userId: members[0].userId, crewMemberId: members[0].crewMemberId, name: members[0].name, profileImageUrl: null, isPrimary: true, assignedAt: "2026-09-20T00:00:00.000Z" }],
    version: 1,
    needsAttention: false,
    access,
    contractSourceSystem: null,
    contractSourceId: null,
    budgetSourceSystem: null,
    budgetSourceId: null,
    budgetEvidenceRef: null,
    allowanceBatchId: null,
    allowanceRevision: 1,
    allowances: readOnly ? [{
      id: "00000000-0000-4000-8000-000000000501",
      recipientUserId: members[2].userId,
      recipientCrewMemberId: members[2].crewMemberId,
      recipientName: members[2].name,
      category: "공연",
      reason: "확정 지급",
      requestedAmountRaw: null,
      grossAmount: 50000,
      taxType: "none",
      taxableAmount: 50000,
      incomeTaxAmount: 0,
      localIncomeTaxAmount: 0,
      deductionAmount: 0,
      netAmount: 50000,
      taxPolicyVersion: null,
      scheduledPaymentDate: null,
      paidAmount: 50000,
      outstandingAmount: 0,
      paymentStatus: "paid",
      evidencePresent: true,
    }] : [],
    receipts: [],
    payments: [],
  };
}

async function mockFinance(page: Page, access: "global" | "project_manager" | "member" = "global", readOnly = false) {
  await page.route(`**/api/finance/projects/${projectId}`, async (route) => {
    if (route.request().method() !== "GET") throw new Error("이 UI 테스트는 저장 요청을 허용하지 않습니다.");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: financeDetail(access, readOnly) }) });
  });
  await page.route("**/api/finance/members", async (route) => {
    if (route.request().method() !== "GET") throw new Error("멤버 목록은 읽기 요청만 허용합니다.");
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: members }) });
  });
}

test.use({ storageState: authState });

test.describe("finance member dropdown", () => {
  test.skip(!enabled, "FINANCE_UI_AUTH_FILE의 권한 있는 storageState가 필요합니다.");

  test("담당자 추가와 주담당자 선택은 이름 검색 및 키보드 선택을 지원한다", async ({ page }, testInfo) => {
    await mockFinance(page);
    await page.goto(`/finance/${projectId}`);
    await expect(page.getByTestId("finance-manager-member-picker")).toBeVisible();

    const managerPicker = page.getByTestId("finance-manager-member-picker");
    await managerPicker.getByRole("button", { name: "재무 담당자 추가" }).click();
    const managerSearch = managerPicker.getByRole("combobox", { name: "재무 담당자 추가 검색" });
    await managerSearch.fill("바다");
    await managerSearch.press("ArrowDown");
    await managerSearch.press("Enter");
    await expect(managerPicker).toContainText("이름으로 담당자 추가");
    await expect(page.getByLabel("박바다 담당자 제거")).toBeVisible();

    await managerPicker.getByRole("button", { name: "재무 담당자 추가" }).click();
    await managerPicker.getByRole("combobox", { name: "재무 담당자 추가 검색" }).fill("박바다");
    await managerPicker.getByRole("combobox", { name: "재무 담당자 추가 검색" }).press("Enter");
    await expect(page.getByLabel("박바다 담당자 제거")).toHaveCount(1);

    const primaryPicker = page.getByTestId("finance-primary-manager-picker");
    await primaryPicker.getByRole("button", { name: "주담당자 선택" }).click();
    await primaryPicker.getByRole("combobox", { name: "주담당자 선택 검색" }).fill("박바다");
    await primaryPicker.getByRole("combobox", { name: "주담당자 선택 검색" }).press("Enter");
    await expect(primaryPicker.getByRole("button", { name: "주담당자 선택" })).toHaveText(/박바다/);

    await managerPicker.getByRole("button", { name: "재무 담당자 추가" }).click();
    await managerPicker.getByRole("combobox", { name: "재무 담당자 추가 검색" }).fill("별빛");
    await expect(managerPicker.getByRole("option", { name: "이별빛" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("finance-member-search.png"), fullPage: true });
  });

  test("수당 참여자 검색은 ID를 선택값으로 유지하고 결과 없음·Escape·바깥 클릭을 처리한다", async ({ page }) => {
    await mockFinance(page);
    await page.goto(`/finance/${projectId}`);
    await page.getByRole("button", { name: "수당 배분" }).click();
    await page.getByRole("button", { name: "항목 추가" }).click();

    const allowancePicker = page.getByTestId("finance-allowance-member-picker");
    await allowancePicker.getByRole("button", { name: "수당 참여자 선택" }).click();
    const allowanceSearch = allowancePicker.getByRole("combobox", { name: "수당 참여자 선택 검색" });
    await allowanceSearch.fill("없는 이름");
    await expect(allowancePicker.getByText("일치하는 참여자가 없습니다.")).toBeVisible();
    await allowanceSearch.press("Escape");
    await expect(allowancePicker.getByRole("listbox")).toBeHidden();

    await allowancePicker.getByRole("button", { name: "수당 참여자 선택" }).click();
    await page.getByRole("heading", { name: "수당 배분안" }).click();
    await expect(allowancePicker.getByRole("listbox")).toBeHidden();

    await allowancePicker.getByRole("button", { name: "수당 참여자 선택" }).click();
    await allowancePicker.getByRole("combobox", { name: "수당 참여자 선택 검색" }).fill("별빛");
    await allowancePicker.getByRole("combobox", { name: "수당 참여자 선택 검색" }).press("Enter");
    await expect(allowancePicker.getByRole("button", { name: "수당 참여자 선택" })).toHaveText(/이별빛/);
  });

  test("지급 이력이 있는 확정 배분안에서는 참여자 선택기와 항목 추가가 렌더링되지 않는다", async ({ page }) => {
    await mockFinance(page, "global", true);
    await page.goto(`/finance/${projectId}`);
    await page.getByRole("button", { name: "수당 배분" }).click();
    await expect(page.getByText("이별빛")).toBeVisible();
    await expect(page.getByTestId("finance-allowance-member-picker")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "항목 추가" })).toHaveCount(0);
  });
});
