import { z } from "zod";
import type {
  FinancePaymentStatus,
  FinanceTaxType,
} from "@/lib/finance-types";

export const FINANCE_TAX_POLICY_VERSION = "kr-business-income-3.3-v1-floor-won";

const nullableMoney = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
const currency = z.string().trim().regex(/^[A-Z]{3}$/);
const optionalText = z.string().trim().max(500).nullable().optional();
const requiredReason = z.string().trim().min(1).max(1000);
const taxType = z.enum([
  "undecided",
  "business_income_3_3",
  "invoice",
  "foreign",
  "none",
]);

export const financeBudgetSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  currency,
  budgetAmount: nullableMoney,
  contractSupplyAmount: nullableMoney,
  contractVatAmount: nullableMoney,
  contractTotalAmount: nullableMoney,
  contractAmountBasis: z.enum(["supply_vat", "total_only", "undecided"]),
  contractNote: z.string().trim().max(1000).nullable().optional(),
  clientName: optionalText,
  contractSourceSystem: optionalText,
  contractSourceId: optionalText,
  budgetSourceSystem: optionalText,
  budgetSourceId: optionalText,
  evidenceRef: z.string().trim().max(2000).nullable().optional(),
  reason: requiredReason,
});

export const financeManagersSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  managers: z
    .array(
      z.object({
        crewMemberId: z.string().uuid(),
        isPrimary: z.boolean().optional(),
      })
    )
    .max(50)
    .superRefine((rows, ctx) => {
      if (new Set(rows.map((row) => row.crewMemberId)).size !== rows.length) {
        ctx.addIssue({ code: "custom", message: "담당자를 중복 지정할 수 없습니다" });
      }
      if (rows.filter((row) => row.isPrimary).length > 1) {
        ctx.addIssue({ code: "custom", message: "주 담당자는 한 명만 지정할 수 있습니다" });
      }
    }),
  reason: requiredReason,
});

export const financeAllowanceSaveSchema = z.object({
  expectedRevision: z.number().int().positive().nullable(),
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        recipientUserId: z.string().uuid(),
        category: z.string().trim().min(1).max(100),
        reason: z.string().trim().min(1).max(500),
        requestedAmountRaw: z.string().trim().max(500).nullable().optional(),
        grossAmount: nullableMoney,
        taxType,
        scheduledPaymentDate: z.string().date().nullable().optional(),
        evidenceRef: z.string().trim().max(2000).nullable().optional(),
      })
    )
    .max(2000),
  reason: z.string().trim().max(1000).nullable().optional(),
});

export const financeTransitionSchema = z.object({
  expectedRevision: z.number().int().positive(),
  reason: z.string().trim().max(1000).nullable().optional(),
});

const transactionStatus = z.enum([
  "executed",
  "failed",
  "cancelled",
  "reversed",
]);

const transactionBase = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
  sourceSystem: z.string().trim().min(1).max(100),
  sourceAccountRef: z.string().trim().min(1).max(200),
  sourceTransactionId: z.string().trim().min(1).max(300),
  sourceOwnedBy: optionalText,
  amount: z.number().finite().positive(),
  currency,
  status: transactionStatus,
  evidenceRef: z.string().trim().max(2000).nullable().optional(),
});

export const financeReceiptSchema = transactionBase
  .extend({
    receivedAt: z.string().datetime({ offset: true }).nullable().optional(),
    counterparty: optionalText,
  })
  .superRefine((value, ctx) => {
    if (value.status === "executed" && !value.receivedAt) {
      ctx.addIssue({ code: "custom", path: ["receivedAt"], message: "실수금에는 입금일시가 필요합니다" });
    }
    if (value.status === "executed" && !value.evidenceRef) {
      ctx.addIssue({ code: "custom", path: ["evidenceRef"], message: "실수금에는 증빙 참조가 필요합니다" });
    }
  });

export const financePaymentSchema = transactionBase
  .extend({
    paidAt: z.string().datetime({ offset: true }).nullable().optional(),
    recipientUserId: z.string().uuid(),
    allocations: z
      .array(
        z.object({
          allowanceItemId: z.string().uuid(),
          amount: z.number().finite().positive(),
        })
      )
      .min(1)
      .max(2000),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.allocations.map((item) => item.allowanceItemId)).size !== value.allocations.length) {
      ctx.addIssue({ code: "custom", path: ["allocations"], message: "같은 수당 항목을 중복 배부할 수 없습니다" });
    }
    const allocated = value.allocations.reduce((sum, item) => sum + item.amount, 0);
    if (allocated > value.amount + 0.000001) {
      ctx.addIssue({ code: "custom", path: ["allocations"], message: "배부액 합계가 거래액을 초과합니다" });
    }
    if (value.status === "executed" && !value.paidAt) {
      ctx.addIssue({ code: "custom", path: ["paidAt"], message: "실지급에는 지급일시가 필요합니다" });
    }
    if (value.status === "executed" && !value.evidenceRef) {
      ctx.addIssue({ code: "custom", path: ["evidenceRef"], message: "실지급에는 증빙 참조가 필요합니다" });
    }
  });

export type FinanceTaxSnapshot = {
  taxableAmount: number;
  incomeTaxAmount: number;
  localIncomeTaxAmount: number;
  deductionAmount: number;
  netAmount: number;
  policyVersion: string;
};

export function calculateFinanceTax(
  grossAmount: number,
  type: FinanceTaxType
): FinanceTaxSnapshot {
  if (!Number.isFinite(grossAmount) || grossAmount < 0) {
    throw new Error("grossAmount must be a finite non-negative number");
  }
  if (!Number.isSafeInteger(grossAmount)) {
    throw new Error("KRW grossAmount must be a safe integer");
  }
  if (type === "undecided") {
    throw new Error("tax type must be decided before confirmation");
  }

  // Keep the browser calculation bit-for-bit aligned with PostgreSQL's
  // trunc(gross * 3 / 100).  Split the integer quotient and remainder so
  // floating point multiplication never rounds a large won amount first.
  const incomeTaxAmount = type === "business_income_3_3"
    ? Math.floor(grossAmount / 100) * 3 + Math.floor((grossAmount % 100) * 3 / 100)
    : 0;
  const localIncomeTaxAmount = type === "business_income_3_3"
    ? Math.floor(incomeTaxAmount / 10)
    : 0;
  const deductionAmount = incomeTaxAmount + localIncomeTaxAmount;

  return {
    taxableAmount: grossAmount,
    incomeTaxAmount,
    localIncomeTaxAmount,
    deductionAmount,
    netAmount: grossAmount - deductionAmount,
    policyVersion: FINANCE_TAX_POLICY_VERSION,
  };
}

export function deriveFinancePaymentStatus(
  netAmount: number,
  executedAmount: number
): FinancePaymentStatus {
  if (executedAmount <= 0) return "not_paid";
  if (executedAmount + 0.000001 < netAmount) return "partially_paid";
  return "paid";
}

export function sumFinanceAmounts(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}
