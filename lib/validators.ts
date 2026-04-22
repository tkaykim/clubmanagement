import { z } from "zod";

// ============================================================
// Base schemas
// ============================================================

const uuidSchema = z.string().uuid();

const timeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식이어야 합니다"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식이어야 합니다"),
});

const voteStatusSchema = z.enum([
  "available",
  "partial",
  "adjustable",
  "unavailable",
]);

// ============================================================
// Project schemas
// ============================================================

const scheduleDateInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  label: z.string().nullable().optional(),
  kind: z.enum(["event", "practice"]).optional().default("event"),
  sort_order: z.number().int().optional(),
});

export const createProjectSchema = z.object({
  title: z.string().min(1, "프로젝트 제목을 입력해주세요").max(200),
  description: z.string().nullable().optional(),
  type: z.enum(["paid_gig", "practice", "audition", "workshop"]),
  visibility: z.enum(["public", "admin", "private"]).default("public"),
  venue: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  pay_type: z.enum(["pay", "fee", "free", "tbd"]).default("free"),
  fee: z.number().int("정수만 입력 가능합니다").min(0, "금액은 0 이상이어야 합니다").default(0),
  max_participants: z.number().int().positive().nullable().optional(),
  recruitment_start_at: z.string().nullable().optional(),
  recruitment_end_at: z.string().nullable().optional(),
  dates: z.array(scheduleDateInputSchema).optional().default([]),
  practiceDates: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      label: z.string().nullable().optional(),
    })
  ).optional().default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(["recruiting", "selecting", "in_progress", "completed", "cancelled"]).optional(),
  poster_url: z.string().url().nullable().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectStatusSchema = z.object({
  status: z.enum(["recruiting", "selecting", "in_progress", "completed", "cancelled"]),
});

// ============================================================
// Application schemas
// ============================================================

export const applySchema = z.object({
  // 인증된 경우 user_id는 서버에서 주입 — 게스트는 guest_* 필드 사용
  guest_name: z.string().min(1, "이름을 입력해주세요").max(100).optional(),
  guest_email: z.string().email("올바른 이메일 주소를 입력해주세요").optional(),
  guest_phone: z.string().max(20).optional(),
  motivation: z.string().max(2000).nullable().optional(),
  fee_agreement: z.enum(["yes", "partial"]).default("yes"),
  answers_note: z.string().max(2000).nullable().optional(),
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  // 가용성 votes: schedule_date_id → vote 데이터
  votes: z.record(
    z.string(),
    z.object({
      status: voteStatusSchema,
      time_slots: z.array(timeSlotSchema).optional().default([]),
      note: z.string().max(500).nullable().optional(),
    }).refine(
      (v) => v.status !== "partial" || (v.time_slots?.length ?? 0) > 0,
      { message: "부분가능은 가능한 시간대를 최소 1개 지정해주세요" }
    )
  ).optional().default({}),
});

export type ApplyInput = z.infer<typeof applySchema>;

export const updateApplySchema = applySchema.partial();

export type UpdateApplyInput = z.infer<typeof updateApplySchema>;

// ============================================================
// Vote / Availability schemas
// ============================================================

export const voteSubmitSchema = z.object({
  votes: z.record(
    z.string(),
    z.object({
      status: voteStatusSchema,
      time_slots: z.array(timeSlotSchema).optional().default([]),
      note: z.string().max(500).nullable().optional(),
    })
  ),
});

export type VoteSubmitInput = z.infer<typeof voteSubmitSchema>;

// ============================================================
// Application management schemas
// ============================================================

export const applicationStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
  memo: z.string().max(1000).optional(),
  score: z.number().min(0).max(10).optional(),
});

export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;

export const bulkStatusSchema = z.object({
  application_ids: z.array(uuidSchema).min(1, "하나 이상 선택해주세요"),
  status: z.enum(["approved", "rejected"]),
});

export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;

// ============================================================
// Announcement schemas
// ============================================================

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(300),
  body: z.string().min(1, "내용을 입력해주세요"),
  scope: z.enum(["team", "project"]).default("team"),
  project_id: z.string().uuid().nullable().optional(),
  pinned: z.boolean().default(false),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

// ============================================================
// Payout schemas
// ============================================================

export const updatePayoutSchema = z.object({
  status: z.enum(["pending", "scheduled", "paid"]).optional(),
  amount: z.number().int().optional(),
  scheduled_at: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export type UpdatePayoutInput = z.infer<typeof updatePayoutSchema>;

// ============================================================
// Member schemas
// ============================================================

export const createMemberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").max(100),
  stage_name: z.string().max(100).nullable().optional(),
  email: z.string().email("올바른 이메일 주소를 입력해주세요").nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
  contract_type: z.enum(["contract", "non_contract", "guest"]).default("contract"),
  position: z.string().max(100).nullable().optional(),
  joined_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "YYYY-MM 형식이어야 합니다")
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = createMemberSchema.partial();

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const memberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

// ============================================================
// Availability preset schemas
// ============================================================

const presetConfigSchema = z.object({
  dow: z.array(z.number().int().min(0).max(6)).optional(),
  timeSlots: z.array(timeSlotSchema).optional(),
  specificDates: z.array(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  ).optional(),
});

export const presetSchema = z.object({
  name: z.string().min(1, "프리셋 이름을 입력해주세요").max(100),
  description: z.string().max(500).nullable().optional(),
  config: presetConfigSchema,
});

export type PresetInput = z.infer<typeof presetSchema>;

// ============================================================
// Auth schemas (kept for completeness)
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

export const signupSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력해주세요").max(100),
});

// ============================================================
// Bug report schemas
// ============================================================

export const createBugReportSchema = z.object({
  title: z
    .string()
    .min(1, "무엇이 문제인지 한 줄로 적어주세요")
    .max(200, "제목은 200자 이하로 적어주세요"),
  description: z
    .string()
    .min(1, "어떤 상황이었는지 알려주세요")
    .max(5000, "설명은 5000자 이하로 적어주세요"),
  severity: z.enum(["low", "medium", "high", "blocker"]).default("medium"),
  // 클라이언트가 자동 캡처해 전송
  page_url: z.string().max(2000).nullable().optional(),
  user_agent: z.string().max(1000).nullable().optional(),
  viewport: z.string().max(50).nullable().optional(),
});

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;

export const updateBugReportSchema = z.object({
  status: z
    .enum(["open", "in_progress", "resolved", "wontfix", "duplicate"])
    .optional(),
  admin_note: z.string().max(5000).nullable().optional(),
});

export type UpdateBugReportInput = z.infer<typeof updateBugReportSchema>;
