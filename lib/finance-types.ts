export type FinanceGlobalRole = "ceo" | "finance";
export type FinanceScope = "global" | "project_manager" | "member";
export type FinanceCurrency = "KRW" | "USD" | "JPY" | "EUR" | string;
export type FinanceContractAmountBasis = "supply_vat" | "total_only" | "undecided";
export type FinanceTaxType =
  | "undecided"
  | "business_income_3_3"
  | "invoice"
  | "foreign"
  | "none";
export type FinanceAllowanceStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "superseded";
export type FinanceTransactionStatus =
  | "pending"
  | "executed"
  | "failed"
  | "cancelled"
  | "reversed";
export type FinancePaymentStatus = "not_paid" | "partially_paid" | "paid";

export type FinanceApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "VERSION_CONFLICT"
  | "DUPLICATE_TRANSACTION"
  | "BUDGET_EXCEEDED"
  | "ALLOCATION_EXCEEDED"
  | "INVALID_STATE"
  | "INTERNAL_ERROR";

export type FinanceApiError = {
  error: string;
  code: FinanceApiErrorCode;
  details?: unknown;
  currentVersion?: number;
};

export type FinanceMoney = {
  currency: FinanceCurrency;
  amount: number | null;
};

export type FinanceManager = {
  id: string;
  userId: string;
  crewMemberId: string;
  name: string;
  profileImageUrl: string | null;
  isPrimary: boolean;
  assignedAt: string;
};

export type FinanceProjectSummary = {
  projectId: string;
  title: string;
  eventDate: string | null;
  clientName: string | null;
  currency: FinanceCurrency;
  budgetAmount: number | null;
  contractSupplyAmount: number | null;
  contractVatAmount: number | null;
  contractTotalAmount: number | null;
  contractAmountBasis: FinanceContractAmountBasis;
  contractNote: string | null;
  receiptExecutedAmount: number;
  receivableAmount: number | null;
  confirmedGrossAmount: number;
  paymentExecutedAmount: number;
  unpaidAmount: number;
  allowanceStatus: FinanceAllowanceStatus | null;
  managers: FinanceManager[];
  version: number;
  needsAttention: boolean;
};

export type FinanceAllowanceItem = {
  id: string;
  recipientUserId: string;
  recipientCrewMemberId: string | null;
  recipientName: string;
  category: string;
  reason: string;
  requestedAmountRaw: string | null;
  grossAmount: number | null;
  taxType: FinanceTaxType;
  taxableAmount: number | null;
  incomeTaxAmount: number | null;
  localIncomeTaxAmount: number | null;
  deductionAmount: number | null;
  netAmount: number | null;
  taxPolicyVersion: string | null;
  scheduledPaymentDate: string | null;
  paidAmount: number;
  outstandingAmount: number | null;
  paymentStatus: FinancePaymentStatus;
  evidencePresent: boolean;
  evidenceRef?: string | null;
};

export type FinanceReceipt = {
  id: string;
  amount: number;
  currency: FinanceCurrency;
  receivedAt: string | null;
  counterparty: string | null;
  status: FinanceTransactionStatus;
  sourceSystem: string;
  sourceTransactionId: string;
  evidencePresent: boolean;
};

export type FinancePayment = {
  id: string;
  recipientUserId: string | null;
  amount: number;
  currency: FinanceCurrency;
  paidAt: string | null;
  status: FinanceTransactionStatus;
  sourceSystem: string;
  sourceTransactionId: string;
  evidencePresent: boolean;
};

export type FinanceProjectDetail = FinanceProjectSummary & {
  access: FinanceScope;
  contractSourceSystem: string | null;
  contractSourceId: string | null;
  budgetSourceSystem: string | null;
  budgetSourceId: string | null;
  budgetEvidenceRef: string | null;
  allowanceBatchId: string | null;
  allowanceRevision: number | null;
  allowances: FinanceAllowanceItem[];
  receipts: FinanceReceipt[];
  payments: FinancePayment[];
};

export type FinanceProjectsResponse = {
  data: FinanceProjectSummary[];
  access: Exclude<FinanceScope, "member">;
  nextCursor: string | null;
};

export type FinanceProjectResponse = { data: FinanceProjectDetail };

export type FinanceMySettlement = {
  projectId: string;
  projectTitle: string;
  eventDate: string | null;
  allowanceBatchId: string;
  confirmedAt: string;
  currency: FinanceCurrency;
  items: FinanceAllowanceItem[];
};

export type FinanceMySettlementsResponse = {
  data: FinanceMySettlement[];
  totals: {
    pendingConfirmationCount: number;
    /** Amount totals are deliberately partitioned: different currencies are never summed. */
    totalsByCurrency: Record<string, {
      confirmedUnpaidAmount: number;
      receivedAmount: number;
    }>;
  };
  nextCursor: string | null;
};

export type FinanceBudgetInput = {
  expectedVersion: number;
  currency: FinanceCurrency;
  budgetAmount: number | null;
  contractSupplyAmount: number | null;
  contractVatAmount: number | null;
  contractTotalAmount: number | null;
  contractAmountBasis: FinanceContractAmountBasis;
  contractNote?: string | null;
  clientName?: string | null;
  contractSourceSystem?: string | null;
  contractSourceId?: string | null;
  budgetSourceSystem?: string | null;
  budgetSourceId?: string | null;
  evidenceRef?: string | null;
  reason: string;
};

export type FinanceManagersInput = {
  expectedVersion: number;
  managers: Array<{
    crewMemberId: string;
    isPrimary?: boolean;
  }>;
  reason: string;
};

export type FinanceAllowanceDraftItemInput = {
  id?: string;
  recipientUserId: string;
  category: string;
  reason: string;
  requestedAmountRaw?: string | null;
  grossAmount: number | null;
  taxType: FinanceTaxType;
  scheduledPaymentDate?: string | null;
  evidenceRef?: string | null;
};

export type FinanceAllowanceSaveInput = {
  expectedRevision: number | null;
  items: FinanceAllowanceDraftItemInput[];
  reason?: string | null;
};

export type FinanceAllowanceTransitionInput = {
  expectedRevision: number;
  reason?: string | null;
};

export type FinanceReceiptInput = {
  idempotencyKey: string;
  sourceSystem: string;
  sourceAccountRef: string;
  sourceTransactionId: string;
  sourceOwnedBy?: string | null;
  amount: number;
  currency: FinanceCurrency;
  receivedAt?: string | null;
  counterparty?: string | null;
  status: FinanceTransactionStatus;
  evidenceRef?: string | null;
};

export type FinancePaymentInput = {
  idempotencyKey: string;
  sourceSystem: string;
  sourceAccountRef: string;
  sourceTransactionId: string;
  sourceOwnedBy?: string | null;
  amount: number;
  currency: FinanceCurrency;
  paidAt?: string | null;
  recipientUserId: string;
  status: FinanceTransactionStatus;
  evidenceRef?: string | null;
  allocations: Array<{
    allowanceItemId: string;
    amount: number;
  }>;
};

export type FinanceMutationResponse = {
  data: FinanceProjectDetail;
};

export type FinanceAuditEvent = {
  id: string;
  projectId: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  occurredAt: string;
};
