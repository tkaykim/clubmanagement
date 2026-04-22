// lib/types.ts — OneShot Crew domain types

// ============================================================
// Base enums / union types
// ============================================================

export type UserRole = "owner" | "admin" | "member";

export type ProjectStatus =
  | "recruiting"
  | "selecting"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ProjectType = "paid_gig" | "practice" | "audition" | "workshop";

export type ScheduleDateKind = "event" | "practice";

export type VoteStatus = "available" | "unavailable" | "maybe";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type FeeAgreement = "yes" | "partial";

export type ContractType = "contract" | "non_contract" | "guest";

export type PayoutStatus = "pending" | "scheduled" | "paid";

export type AnnouncementScope = "team" | "project";

export type FormFieldType =
  | "short_text"
  | "long_text"
  | "radio"
  | "checkbox"
  | "select";

// ============================================================
// DB Row types (1:1 with table columns)
// ============================================================

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type CrewMember = {
  id: string;
  user_id: string | null;
  name: string;
  stage_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  position: string | null;
  contract_type: ContractType;
  is_active: boolean;
  joined_month: string | null; // 'YYYY-MM'
  joined_at: string;
  created_at: string;
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  status: ProjectStatus;
  type: ProjectType;
  venue: string | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule_undecided: boolean;
  fee: number; // negative = participation cost
  recruitment_start_at: string | null;
  recruitment_end_at: string | null;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleDate = {
  id: string;
  project_id: string;
  date: string; // YYYY-MM-DD
  label: string | null;
  kind: ScheduleDateKind;
  sort_order: number;
  created_at: string;
};

export type TimeSlot = { start: string; end: string };

export type ScheduleVote = {
  id: string;
  schedule_date_id: string;
  user_id: string;
  status: VoteStatus;
  time_slots: TimeSlot[];
  note: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectApplication = {
  id: string;
  project_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: ApplicationStatus;
  answers: Record<string, unknown>;
  motivation: string | null;
  score: number | null;
  memo: string | null;
  answers_note: string | null;
  fee_agreement: FeeAgreement;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FormField = {
  id: string;
  project_id: string;
  sort_order: number;
  type: FormFieldType;
  label: string;
  required: boolean;
  options: string[];
  created_at: string;
};

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
};

export type Payout = {
  id: string;
  project_id: string;
  application_id: string;
  user_id: string | null;
  amount: number;
  status: PayoutStatus;
  scheduled_at: string | null; // DATE
  paid_at: string | null; // DATE
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PresetConfig = {
  dow?: number[]; // 0=Sun ~ 6=Sat
  timeSlots?: TimeSlot[];
  specificDates?: string[]; // YYYY-MM-DD
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

// ============================================================
// Composite / joined types (for Server Component props)
// ============================================================

export type AnnouncementWithAuthor = Announcement & {
  author: Pick<User, "id" | "name"> | null;
};

export type ApplicationWithMember = ProjectApplication & {
  crew_member: CrewMember | null;
};

export type PayoutWithMember = Payout & {
  crew_member: CrewMember | null;
};

export type ProjectWithDates = Project & {
  schedule_dates: ScheduleDate[];
  _application_count: number;
  _confirmed_count: number;
};

// ============================================================
// Aggregation types (RPC / client-computed)
// ============================================================

export type AvailabilitySummary = {
  date: string; // YYYY-MM-DD
  schedule_date_id: string;
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

// ============================================================
// Calendar / UI helper types
// ============================================================

export type CalendarEvent = {
  title: string;
  kind: ScheduleDateKind;
  label: string | null;
  application_status: ApplicationStatus | null;
  project_id: string;
  project_type: ProjectType;
  venue: string | null;
};

export type CalendarDateMap = Record<string, CalendarEvent[]>; // keyed by YYYY-MM-DD
