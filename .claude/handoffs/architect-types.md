# Types & Constants — OneShot Crew

## 1. lib/types.ts 변경 목록

### 기존 타입 수정

#### ProjectStatus (확장)
```typescript
// 기존: "recruiting" | "in_progress" | "completed" | "cancelled"
// 변경: selecting 추가
export type ProjectStatus =
  | "recruiting"
  | "selecting"
  | "in_progress"
  | "completed"
  | "cancelled";
```

#### Project (필드 추가)
```typescript
export type ProjectType = "paid_gig" | "practice" | "audition" | "workshop";

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  status: ProjectStatus;
  type: ProjectType;           // NEW
  venue: string | null;        // NEW
  address: string | null;      // NEW
  start_date: string | null;
  end_date: string | null;
  schedule_undecided: boolean;
  fee: number;                 // 음수 = 참가비
  recruitment_start_at: string | null;
  recruitment_end_at: string | null;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
};
```

#### ScheduleDate (kind 추가)
```typescript
export type ScheduleDateKind = "event" | "practice";

export type ScheduleDate = {
  id: string;
  project_id: string;
  date: string;            // YYYY-MM-DD
  label: string | null;
  kind: ScheduleDateKind;  // NEW
  sort_order: number;
  created_at: string;
};
```

#### ProjectApplication (필드 추가)
```typescript
export type FeeAgreement = "yes" | "partial";

export type ProjectApplication = {
  id: string;
  project_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;   // NEW
  guest_phone: string | null;
  status: ApplicationStatus;
  answers: Record<string, unknown>;
  motivation: string | null;    // NEW
  score: number | null;         // NEW
  memo: string | null;          // NEW
  answers_note: string | null;  // NEW
  fee_agreement: FeeAgreement;  // NEW
  reviewed_at: string | null;   // NEW
  reviewed_by: string | null;   // NEW
  created_at: string;
  updated_at: string;
};
```

#### CrewMember (필드 추가)
```typescript
export type ContractType = "contract" | "non_contract" | "guest";

export type CrewMember = {
  id: string;
  user_id: string | null;
  name: string;
  stage_name: string | null;    // NEW — 예명
  email: string | null;
  phone: string | null;
  role: UserRole;
  position: string | null;      // NEW — 포지션 (리더, 퍼포머, 안무 등)
  contract_type: ContractType;  // NEW
  is_active: boolean;
  joined_month: string | null;  // NEW — 'YYYY-MM'
  joined_at: string;
  created_at: string;
};
```

---

### 신규 타입

```typescript
// ---- Announcements ----
export type AnnouncementScope = "team" | "project";

export type Announcement = {
  id: string;
  author_id: string;
  project_id: string | null;
  scope: AnnouncementScope;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  // 조인 시 포함
  author?: Pick<User, "id" | "name">;
};

// ---- Payouts ----
export type PayoutStatus = "pending" | "scheduled" | "paid";

export type Payout = {
  id: string;
  project_id: string;
  application_id: string;
  user_id: string | null;
  amount: number;
  status: PayoutStatus;
  scheduled_at: string | null;    // DATE
  paid_at: string | null;         // DATE
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Availability Presets ----
export type PresetConfig = {
  dow?: number[];                            // 0=일~6=토
  timeSlots?: Array<{ start: string; end: string }>;
  specificDates?: string[];                  // YYYY-MM-DD
};

export type AvailabilityPreset = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  config: PresetConfig;
  created_at: string;
  updated_at: string;
};

// ---- 집계용 타입 (View/RPC 결과) ----
export type AvailabilitySummary = {
  date: string;          // YYYY-MM-DD
  available: number;
  maybe: number;
  unavailable: number;
  total: number;
};

export type SettlementMember = {
  user_id: string;
  name: string;
  stage_name: string | null;
  project_count: number;
  total_amount: number;
  paid_amount: number;
  scheduled_amount: number;
  pending_amount: number;
};

// ---- 페이지용 복합 타입 (Server Component props) ----
export type ProjectWithDates = Project & {
  schedule_dates: ScheduleDate[];
  _application_count: number;
  _confirmed_count: number;
};

export type ApplicationWithMember = ProjectApplication & {
  crew_member?: CrewMember;
};
```

---

## 2. lib/constants.ts 추가/변경

```typescript
// 기존 상수 대체/확장

export const DOW_SHORT = ["일", "월", "화", "수", "목", "금", "토"] as const;
export const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

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
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  paid_gig: "유료행사",
  practice: "연습",
  audition: "오디션",
  workshop: "워크숍",
};

export const CONTRACT_LABELS: Record<string, string> = {
  contract: "계약",
  non_contract: "비계약",
  guest: "게스트",
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "OWNER",
  admin: "ADMIN",
  member: "MEMBER",
};

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  scheduled: "예정",
  paid: "지급완료",
};

export const ANNOUNCEMENT_SCOPE_LABELS: Record<string, string> = {
  team: "팀",
  project: "프로젝트",
};

// 스케줄 종류
export const SCHEDULE_KIND_LABELS: Record<string, string> = {
  event: "본행사",
  practice: "연습",
};
```

---

## 3. Zod 스키마 인벤토리 (lib/validators.ts)

기존 파일의 스키마를 아래로 교체/추가:

```
createProjectSchema       : title, type, fee, venue, address, desc, max_participants,
                            recruitment_end_at, schedule_undecided,
                            dates: [{date, label}], practiceDates: [{date}]

updateProjectSchema       : Partial<createProjectSchema> & { status? }

applySchema               : motivation?, fee_agreement, votes, answers_note?
                            + 게스트: guest_name, guest_email, guest_phone
                            (user_id는 서버에서 auth.uid()로 처리)

updateApplySchema         : Partial<applySchema>

voteSubmitSchema          : { votes: Record<string, { status, time_slots: [{start,end}]?, note? }> }

applicationStatusSchema   : { status: "approved"|"rejected"|"pending", memo?, score? }

bulkStatusSchema          : { application_ids: string[], status: "approved"|"rejected" }

createAnnouncementSchema  : { title, body, scope, project_id?, pinned? }

updateAnnouncementSchema  : Partial<createAnnouncementSchema>

updatePayoutSchema        : { status?, amount?, scheduled_at?, paid_at?, note? }

createMemberSchema        : { name, stage_name?, email?, phone?, role, contract_type,
                              position?, joined_month? }

updateMemberSchema        : Partial<createMemberSchema>

presetSchema              : { name, description?, config: PresetConfig }
```

모든 스키마는 Zod v4 (`import { z } from "zod"`) 사용.
Route Handler에서 `schema.safeParse(body)` → 실패 시 400 반환.
