// lib/constants.ts — OneShot Crew display labels and constants

// ============================================================
// Day-of-week labels
// ============================================================

export const DOW_SHORT = ["일", "월", "화", "수", "목", "금", "토"] as const;
export const DOW_FULL = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

// ============================================================
// Status labels (project + application + vote + payout)
// ============================================================

export const STATUS_LABELS: Record<string, string> = {
  // Project status
  recruiting: "모집중",
  selecting: "선별중",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
  // Application status
  pending: "대기",
  approved: "확정",
  rejected: "탈락",
  // Vote status
  available: "가능",
  maybe: "부분",
  unavailable: "불가",
  // Payout status
  paid: "지급완료",
  scheduled: "예정",
} as const;

// ============================================================
// Project type labels
// ============================================================

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  paid_gig: "유료행사",
  practice: "연습",
  audition: "오디션",
  workshop: "워크숍",
} as const;

// ============================================================
// Contract type labels
// ============================================================

export const CONTRACT_LABELS: Record<string, string> = {
  contract: "계약",
  non_contract: "비계약",
  guest: "게스트",
} as const;

// ============================================================
// Role labels
// ============================================================

export const ROLE_LABELS: Record<string, string> = {
  owner: "OWNER",
  admin: "ADMIN",
  member: "MEMBER",
} as const;

// ============================================================
// Payout status labels
// ============================================================

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  scheduled: "예정",
  paid: "지급완료",
} as const;

// ============================================================
// Announcement scope labels
// ============================================================

export const ANNOUNCEMENT_SCOPE_LABELS: Record<string, string> = {
  team: "팀",
  project: "프로젝트",
} as const;

// ============================================================
// Schedule kind labels
// ============================================================

export const SCHEDULE_KIND_LABELS: Record<string, string> = {
  event: "본행사",
  practice: "연습",
} as const;

// ============================================================
// Fee agreement labels
// ============================================================

export const FEE_AGREEMENT_LABELS: Record<string, string> = {
  yes: "동의합니다",
  partial: "조정 희망",
} as const;

// ============================================================
// Manage page tab labels
// ============================================================

export const MANAGE_TABS = [
  { id: "applicants", label: "지원자" },
  { id: "roster", label: "로스터" },
  { id: "availability", label: "가용성" },
  { id: "settlement", label: "정산" },
  { id: "announce", label: "공지" },
  { id: "settings", label: "설정" },
] as const;

export type ManageTab = (typeof MANAGE_TABS)[number]["id"];

// ============================================================
// My page tab labels
// ============================================================

export const MYPAGE_TABS = [
  { id: "apps", label: "지원 이력" },
  { id: "payouts", label: "정산" },
  { id: "presets", label: "가용성 프리셋" },
  { id: "profile", label: "프로필" },
] as const;

export type MypageTab = (typeof MYPAGE_TABS)[number]["id"];

// ============================================================
// Mobile bottom nav tabs
// ============================================================

export const BOTTOM_NAV_TABS = [
  { id: "home", label: "홈", href: "/" },
  { id: "projects", label: "프로젝트", href: "/projects" },
  { id: "apply", label: "지원", href: "/apply", isAction: true },
  { id: "calendar", label: "캘린더", href: "/calendar" },
  { id: "mypage", label: "마이", href: "/mypage" },
] as const;

// ============================================================
// Project filter options (for ProjectList)
// ============================================================

export const PROJECT_TYPE_OPTIONS = [
  { value: "all", label: "유형 전체" },
  { value: "paid_gig", label: "유료행사" },
  { value: "practice", label: "연습" },
  { value: "audition", label: "오디션" },
  { value: "workshop", label: "워크숍" },
] as const;

export const PROJECT_STATUS_FILTER_OPTIONS = [
  { value: "active", label: "진행중" },
  { value: "past", label: "지난" },
  { value: "draft", label: "임시" },
] as const;

// ============================================================
// Application status badge variant map
// ============================================================

export const APPLICATION_STATUS_BADGE: Record<
  string,
  { label: string; kind: string }
> = {
  pending: { label: "대기", kind: "warn" },
  approved: { label: "확정", kind: "ok" },
  rejected: { label: "탈락", kind: "danger" },
} as const;

// ============================================================
// Payout status badge variant map
// ============================================================

export const PAYOUT_STATUS_BADGE: Record<
  string,
  { label: string; kind: string }
> = {
  pending: { label: "대기", kind: "outline" },
  scheduled: { label: "예정", kind: "warn" },
  paid: { label: "지급완료", kind: "ok" },
} as const;
