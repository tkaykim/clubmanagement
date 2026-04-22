import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================
// Tailwind merge helper
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// String helpers
// ============================================================

/**
 * 이니셜 계산: 한글은 마지막 2자, 영문은 첫 글자(들)
 */
export function initials(name = ""): string {
  const s = name.trim();
  if (!s) return "—";
  if (/[가-힣]/.test(s)) return s.slice(-2);
  const parts = s.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ============================================================
// Number / currency helpers
// ============================================================

/**
 * 원화 포맷 (₩ 없이 천단위 콤마)
 * fmtKRW(350000) → "350,000"
 */
export function fmtKRW(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

/**
 * 0 패딩 2자리
 */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ============================================================
// Project pay_type helpers
// ============================================================

export type PayType = "pay" | "fee" | "free" | "tbd";

export const PAY_TYPE_OPTIONS: Array<{
  value: PayType;
  label: string;
  hint: string;
  needsAmount: boolean;
}> = [
  { value: "pay", label: "페이 있음", hint: "참가자에게 출연료를 지급", needsAmount: true },
  { value: "fee", label: "참가비 있음", hint: "참가자가 참가비 지불", needsAmount: true },
  { value: "free", label: "무료 행사", hint: "금액 없음", needsAmount: false },
  { value: "tbd", label: "미정", hint: "아직 결정되지 않음", needsAmount: false },
];

/**
 * pay_type + fee 조합을 사람이 읽는 한 줄 문구로.
 * 리스트 카드의 칩/배지 내부 텍스트용.
 */
export function fmtPay(payType: PayType | string | null | undefined, fee: number | null | undefined): string {
  const pt = (payType ?? "free") as PayType;
  const amount = Math.abs(fee ?? 0);
  switch (pt) {
    case "pay":
      return amount > 0 ? `페이 ₩${fmtKRW(amount)}` : "페이 있음";
    case "fee":
      return amount > 0 ? `참가비 ₩${fmtKRW(amount)}` : "참가비 있음";
    case "free":
      return "무료 행사";
    case "tbd":
      return "비용 미정";
    default:
      return "";
  }
}

/**
 * 칩 색 힌트 (optional 사용)
 */
export function payTypeChipTone(payType: PayType | string | null | undefined): "ok" | "warn" | "muted" {
  const pt = (payType ?? "free") as PayType;
  if (pt === "pay") return "ok";
  if (pt === "fee") return "warn";
  return "muted";
}

// ============================================================
// Date helpers
// ============================================================

/**
 * Date → "YYYY-MM-DD" 키 변환
 */
export function dateKey(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/**
 * n일 더하기
 */
export function addDays(d: Date | string, n: number): Date {
  const x = d instanceof Date ? new Date(d) : new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * 월별 42셀 캘린더 매트릭스 생성
 * month: 0-indexed (0 = 1월)
 */
export function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}

/**
 * "YYYY-MM" 형식에서 year, month(0-indexed) 추출
 */
export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m - 1 };
}

/**
 * Date → "YYYY-MM" 형식
 */
export function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/**
 * "YYYY-MM-DD" → 표시용 한국어 날짜 (예: "5월 15일 (목)")
 */
export function fmtDateKo(dateStr: string): string {
  const DOW_SHORT_KO = ["일", "월", "화", "수", "목", "금", "토"];
  const dt = new Date(dateStr + "T00:00:00");
  const m = dt.getMonth() + 1;
  const dd = dt.getDate();
  const dow = DOW_SHORT_KO[dt.getDay()];
  return `${m}월 ${dd}일 (${dow})`;
}

// ============================================================
// Availability matrix builder
// ============================================================

export type VoteStatusRaw =
  | "available"
  | "partial"
  | "adjustable"
  | "unavailable";

export interface VoteRow {
  schedule_date_id: string;
  user_id: string;
  status: VoteStatusRaw;
}

export interface AvailabilityCellData {
  status: VoteStatusRaw | null;
}

/**
 * votes 배열을 matrix[user_id][schedule_date_id] 구조로 변환
 */
export function buildAvailabilityMatrix(
  votes: VoteRow[],
  userIds: string[],
  dateIds: string[]
): Record<string, Record<string, AvailabilityCellData>> {
  const matrix: Record<string, Record<string, AvailabilityCellData>> = {};
  for (const uid of userIds) {
    matrix[uid] = {};
    for (const did of dateIds) {
      matrix[uid][did] = { status: null };
    }
  }
  for (const v of votes) {
    if (matrix[v.user_id] && v.schedule_date_id in matrix[v.user_id]) {
      matrix[v.user_id][v.schedule_date_id] = { status: v.status };
    }
  }
  return matrix;
}

// ============================================================
// Misc
// ============================================================

/**
 * 값이 null/undefined/빈문자면 null 반환 (DB nullable 처리용)
 */
export function nullableStr(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v.trim() === "") return null;
  return v;
}
