export function formatWon(value: number | null, compact = false, currency = "KRW"): string {
  if (value == null) return "미입력";
  if (currency === "KRW") {
    if (compact && Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억 원`;
    if (compact && Math.abs(value) >= 10_000) return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만 원`;
    return `${value.toLocaleString("ko-KR")}원`;
  }
  return `${value.toLocaleString("ko-KR")} ${currency}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "미정";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(value));
}

export function financeStatusLabel(status: string): string {
  return ({
    setup_required: "보완 필요",
    draft: "배분 작성 중",
    submitted: "재무 검토 중",
    confirmed: "정산 확정",
    not_paid: "미지급",
    partially_paid: "일부 지급",
    paid: "지급 완료",
    closed: "마감",
    awaiting_confirmation: "확정 대기",
    completed: "완료",
    pending: "처리 중",
    failed: "실패",
    cancelled: "취소",
    reversed: "반제",
  } as Record<string, string>)[status] ?? status;
}

export function financeStatusTone(status: string): "ok" | "warn" | "danger" | "info" | "outline" {
  if (["paid", "closed", "completed"].includes(status)) return "ok";
  if (["submitted", "confirmed", "pending", "partially_paid"].includes(status)) return "info";
  if (["setup_required", "failed", "cancelled"].includes(status)) return "danger";
  if (["draft", "not_paid", "awaiting_confirmation"].includes(status)) return "warn";
  return "outline";
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: unknown; message?: unknown };
  if (typeof candidate.error === "string") return candidate.error;
  if (typeof candidate.message === "string") return candidate.message;
  return fallback;
}
