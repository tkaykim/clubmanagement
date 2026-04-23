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

export type ProjectType = "paid_gig" | "practice" | "audition" | "workshop" | "shooting";

export type ProjectVisibility = "public" | "admin" | "private";

export type ProjectPayType = "pay" | "fee" | "free" | "tbd";

export type ScheduleDateKind = "event" | "practice";

// 가능 / 부분가능(일부 시간만) / 조정가능(전체되지만 협의) / 불가
export type VoteStatus = "available" | "partial" | "adjustable" | "unavailable";

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

export type BugSeverity = "low" | "medium" | "high" | "blocker";

export type BugStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "wontfix"
  | "duplicate";

export type BugReport = {
  id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  title: string;
  description: string;
  severity: BugSeverity;
  page_url: string | null;
  user_agent: string | null;
  viewport: string | null;
  status: BugStatus;
  admin_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================
// DB Row types (1:1 with table columns)
// ============================================================

// 권한은 crew_members.role 에서 관리한다. User 는 계정 정보(연락처)만 보유.
export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
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
  visibility: ProjectVisibility;
  venue: string | null;
  address: string | null;
  pay_type: ProjectPayType;
  fee: number; // pay_type 가 부호/의미를 담당, fee 는 항상 ≥0
  recruitment_start_at: string | null;
  recruitment_end_at: string | null;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
};

// projects_with_range VIEW: schedule_dates 의 MIN/MAX 로 파생된 기간 포함
export type ProjectWithRange = Project & {
  start_date: string | null;
  end_date: string | null;
  schedule_undecided: boolean;
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

export type TimeSlotKind = "available" | "unavailable";
// kind 는 선택 — 과거 데이터는 undefined 일 수 있으며 "available" 로 해석한다.
export type TimeSlot = { start: string; end: string; kind?: TimeSlotKind };

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
  partial: number;
  adjustable: number;
  unavailable: number;
  total: number;
};

export type ProjectApplicationCount = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
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

// ============================================================
// Portfolio domain types
// ============================================================

export type PortfolioSectionKey =
  | "hero_title"
  | "hero_subtitle"
  | "about_team"
  | "genres"
  | "contact_email"
  | "contact_phone";

export type PortfolioMediaKind =
  | "hero_image"
  | "hero_video"
  | "photo"
  | "performance"
  | "cover"
  | "other_video";

export type PortfolioCareerCategory =
  | "performance"
  | "broadcast"
  | "commercial"
  | "competition"
  | "workshop";

export type PortfolioInquiryType =
  | "performance"
  | "broadcast"
  | "commercial"
  | "workshop"
  | "other";

export type PortfolioInquiryTargetType = "team" | "member";

export type PortfolioInquiryBudgetType = "fixed" | "range" | "tbd";

export type PortfolioInquiryStatus = "new" | "in_review" | "contacted" | "closed";

// ============================================================
// Portfolio DB Row types (1:1 with table columns)
// ============================================================

export type PortfolioSection = {
  id: string;
  key: PortfolioSectionKey;
  value: string;
  updated_by: string | null;
  updated_at: string;
};

export type PortfolioMedia = {
  id: string;
  kind: PortfolioMediaKind;
  title: string | null;
  description: string | null;
  image_url: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_featured: boolean;
  event_date: string | null; // YYYY-MM-DD
  venue: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PortfolioMediaMember = {
  media_id: string;
  crew_member_id: string;
  sort_order: number;
};

export type PortfolioCareer = {
  id: string;
  title: string;
  category: PortfolioCareerCategory | null;
  event_date: string | null; // YYYY-MM-DD
  location: string | null;
  description: string | null;
  link_url: string | null;
  media_id: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PortfolioInquiry = {
  id: string;
  target_type: PortfolioInquiryTargetType;
  target_member_id: string | null;
  reference_media_id: string | null;
  inquiry_type: PortfolioInquiryType;
  requester_name: string;
  requester_organization: string | null;
  requester_email: string;
  requester_phone: string | null;
  region: string | null;
  event_date_start: string | null; // YYYY-MM-DD
  event_date_end: string | null;   // YYYY-MM-DD
  event_time: string | null;
  budget_type: PortfolioInquiryBudgetType;
  budget_amount: number | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string;
  status: PortfolioInquiryStatus;
  admin_memo: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 공개 포트폴리오 페이지에서 노출할 멤버 필드만 포함.
 * crew_members 테이블의 민감 컬럼(email, phone)은 제외.
 * public_crew_members_view 뷰 또는 API select 제한과 일치.
 */
export type PublicCrewMember = {
  id: string;
  stage_name: string | null;
  name: string;
  position: string | null;
  profile_image_url: string | null;
  public_bio: string | null;
  specialties: string[] | null;
  is_public: boolean;
  is_active: boolean;
  joined_month: string | null; // YYYY-MM
};

// ============================================================
// Portfolio composite / joined types
// ============================================================

/** 미디어 + 참여 멤버 목록 (공개 페이지 렌더용) */
export type PortfolioMediaWithMembers = PortfolioMedia & {
  members: Pick<PublicCrewMember, "id" | "stage_name" | "name" | "profile_image_url">[];
};

/** 경력 + 연관 미디어 (타임라인 렌더용) */
export type PortfolioCareerWithMedia = PortfolioCareer & {
  media: Pick<PortfolioMedia, "id" | "title" | "thumbnail_url" | "youtube_url"> | null;
};

// ============================================================
// Portfolio API DTO types
// ============================================================

/** GET /api/portfolio/public 응답 */
export type PortfolioPublicData = {
  sections: Record<PortfolioSectionKey, string>;
  media: PortfolioMediaWithMembers[];
  careers: PortfolioCareerWithMedia[];
  members: PublicCrewMember[];
};

/** PATCH /api/portfolio/sections 요청 body 요소 */
export type PortfolioSectionUpsert = {
  key: PortfolioSectionKey;
  value: string;
};

/** POST /api/portfolio/media/reorder 요청 body */
export type MediaReorderItem = {
  id: string;
  sort_order: number;
};

/** POST /api/portfolio/upload-url 요청 body */
export type UploadUrlRequest = {
  kind: "hero" | "photos" | "thumbnails" | "members";
  ext: string;
};

/** POST /api/portfolio/upload-url 응답 */
export type UploadUrlResponse = {
  signedUrl: string;
  path: string;
  publicUrl: string;
};
