import { z } from "zod";

// ============================================================
// Base schemas
// ============================================================

const uuidSchema = z.string().uuid();

// NOTE: kind 필드는 2026-04 추가 — 과거 저장 데이터는 kind 가 없어도
// default("available") 로 안전하게 읽힌다. DB 스키마(JSONB) 변경 불필요.
const timeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식이어야 합니다"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식이어야 합니다"),
  kind: z.enum(["available", "unavailable"]).optional().default("available"),
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
  type: z.enum(["paid_gig", "practice", "audition", "workshop", "shooting"]),
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

// ============================================================
// Portfolio schemas
// ============================================================

export const portfolioSectionUpdateSchema = z.object({
  key: z.enum([
    "hero_title",
    "hero_subtitle",
    "about_team",
    "genres",
    "contact_email",
    "contact_phone",
  ]),
  value: z.string().max(2000, "2000자 이하로 입력해주세요"),
});

export type PortfolioSectionUpdateInput = z.infer<typeof portfolioSectionUpdateSchema>;

export const portfolioMediaInputSchema = z.object({
  kind: z.enum([
    "hero_image",
    "hero_video",
    "photo",
    "performance",
    "cover",
    "other_video",
  ]),
  title: z.string().max(200, "제목은 200자 이하로 입력해주세요").optional().nullable(),
  description: z.string().max(2000, "설명은 2000자 이하로 입력해주세요").optional().nullable(),
  image_url: z.string().url("올바른 URL을 입력해주세요").optional().nullable(),
  // YouTube URL은 기본 .url() 검증 후 route handler에서 extractYouTubeId 로 검증
  youtube_url: z.string().url("올바른 YouTube URL을 입력해주세요").optional().nullable(),
  thumbnail_url: z.string().url("올바른 URL을 입력해주세요").optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_featured: z.boolean().default(false),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다")
    .optional()
    .nullable(),
  venue: z.string().max(200, "장소는 200자 이하로 입력해주세요").optional().nullable(),
  member_ids: z.array(z.string().uuid()).default([]),
});

export type PortfolioMediaInput = z.infer<typeof portfolioMediaInputSchema>;

export const portfolioCareerInputSchema = z.object({
  title: z
    .string()
    .min(1, "경력 제목을 입력해주세요")
    .max(300, "경력 제목은 300자 이하로 입력해주세요"),
  category: z
    .enum(["performance", "broadcast", "commercial", "competition", "workshop"])
    .optional()
    .nullable(),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다")
    .optional()
    .nullable(),
  location: z.string().max(200, "장소는 200자 이하로 입력해주세요").optional().nullable(),
  description: z.string().max(2000, "설명은 2000자 이하로 입력해주세요").optional().nullable(),
  link_url: z.string().url("올바른 URL을 입력해주세요").optional().nullable(),
  media_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
});

export type PortfolioCareerInput = z.infer<typeof portfolioCareerInputSchema>;

export const portfolioInquiryInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "제목을 입력해주세요")
      .max(200, "제목은 200자 이하로 입력해주세요"),
    target_type: z.enum(["team", "member"]),
    target_member_id: z.string().uuid().optional().nullable(),
    reference_media_id: z.string().uuid().optional().nullable(),
    inquiry_type: z.enum([
      "performance",
      "broadcast",
      "commercial",
      "workshop",
      "other",
    ]),
    requester_name: z
      .string()
      .min(1, "이름을 입력해주세요")
      .max(80, "이름은 80자 이하로 입력해주세요"),
    requester_organization: z
      .string()
      .max(200, "소속은 200자 이하로 입력해주세요")
      .optional()
      .nullable(),
    requester_email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    requester_phone: z
      .string()
      .max(40, "연락처는 40자 이하로 입력해주세요")
      .optional()
      .nullable(),
    region: z.string().max(200, "지역은 200자 이하로 입력해주세요").optional().nullable(),
    event_date_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다")
      .optional()
      .nullable(),
    event_date_end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다")
      .optional()
      .nullable(),
    event_time: z
      .string()
      .max(100, "공연 시간은 100자 이하로 입력해주세요")
      .optional()
      .nullable(),
    budget_type: z.enum(["fixed", "range", "tbd"]).default("tbd"),
    budget_amount: z.number().int().min(0).optional().nullable(),
    budget_min: z.number().int().min(0).optional().nullable(),
    budget_max: z.number().int().min(0).optional().nullable(),
    message: z
      .string()
      .min(10, "문의 내용을 10자 이상 입력해주세요")
      .max(4000, "문의 내용은 4000자 이하로 입력해주세요"),
  })
  .refine(
    (d) => d.target_type === "team" || !!d.target_member_id,
    {
      message: "개인 섭외 시 멤버를 선택해주세요",
      path: ["target_member_id"],
    }
  )
  .refine(
    (d) => {
      if (d.event_date_start && d.event_date_end) {
        return d.event_date_start <= d.event_date_end;
      }
      return true;
    },
    {
      message: "종료일은 시작일보다 같거나 이후여야 합니다",
      path: ["event_date_end"],
    }
  )
  .refine(
    (d) => {
      if (d.budget_type === "range") {
        if (d.budget_min != null && d.budget_max != null) {
          return d.budget_min <= d.budget_max;
        }
      }
      return true;
    },
    {
      message: "최대 예산은 최소 예산보다 같거나 커야 합니다",
      path: ["budget_max"],
    }
  );

export type PortfolioInquiryInput = z.infer<typeof portfolioInquiryInputSchema>;

/** 관리자 문의 상태 업데이트 */
export const portfolioInquiryAdminUpdateSchema = z.object({
  status: z.enum(["new", "in_review", "contacted", "on_hold", "closed"]).optional(),
  admin_memo: z.string().max(2000).optional().nullable(),
});

export type PortfolioInquiryAdminUpdateInput = z.infer<
  typeof portfolioInquiryAdminUpdateSchema
>;

/** 멤버 공개 프로필 업데이트 (owner/admin 또는 본인) */
export const memberPublicProfileSchema = z.object({
  profile_image_url: z.string().url("올바른 URL을 입력해주세요").optional().nullable(),
  is_public: z.boolean().optional(),
  public_bio: z.string().max(500, "소개는 500자 이하로 입력해주세요").optional().nullable(),
  specialties: z.array(z.string().max(50)).max(10).optional().nullable(),
});

export type MemberPublicProfileInput = z.infer<typeof memberPublicProfileSchema>;
