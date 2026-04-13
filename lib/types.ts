// ===== Database Row Types =====

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  mbti: string | null;
  created_at: string;
  updated_at: string;
};

export type Interest = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type UserInterest = {
  user_id: string;
  interest_id: string;
  created_at: string;
};

export type ClubInterest = {
  club_id: string;
  interest_id: string;
  created_at: string;
};

export type ClubWithInterests = Club & {
  interests: Interest[];
};

export type University = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Club = {
  id: string;
  name: string;
  name_ko: string | null;
  name_en: string | null;
  description: string | null;
  category: string;
  max_members: number;
  is_recruiting: boolean;
  is_university_based: boolean;
  university_id: string | null;
  owner_id: string;
  recruitment_deadline_at: string | null;
  created_at: string;
  updated_at: string;
};

/** 동아리 표시 이름 (한글·영문 둘 다 있으면 둘 다, 아니면 하나) */
export function getClubDisplayName(club: { name_ko?: string | null; name_en?: string | null; name?: string }): string {
  const ko = club.name_ko?.trim();
  const en = club.name_en?.trim();
  if (ko && en) return `${ko} (${en})`;
  if (ko) return ko;
  if (en) return en;
  return club.name ?? "";
}

export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "pending" | "approved" | "rejected";

export type Member = {
  id: string;
  club_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
};

export type Schedule = {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  created_by: string;
  created_at: string;
};

export type RsvpStatus = "attending" | "declined" | "pending";

export type ScheduleRsvp = {
  id: string;
  schedule_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
};

export type ProjectStatus = "planning" | "in_progress" | "completed" | "cancelled";

export type Project = {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  starts_at: string | null;
  ends_at: string | null;
  participation_fee: number;
  recruitment_start_at: string | null;
  recruitment_deadline_at: string | null;
  schedule_undecided: boolean;
  poster_url: string | null;
  visibility: "club_only" | "public";
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectMemberRole = "lead" | "member";

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  joined_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";

/** 프로젝트 모집 폼 문항 타입 */
export type RecruitmentQuestionType =
  | "short_text"
  | "long_text"
  | "paragraph_short"
  | "paragraph_long"
  | "radio"
  | "checkbox"
  | "select"
  | "file_upload";

export type ProjectRecruitmentForm = {
  id: string;
  project_id: string;
  title: string | null;
  description: string | null;
  poster_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectRecruitmentQuestion = {
  id: string;
  form_id: string;
  sort_order: number;
  type: RecruitmentQuestionType;
  label: string;
  required: boolean;
  options: string[] | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectApplicationStatus = "pending" | "approved" | "rejected";

export type ProjectApplication = {
  id: string;
  project_id: string;
  user_id: string;
  status: ProjectApplicationStatus;
  created_at: string;
};

export type ProjectApplicationWithUser = ProjectApplication & {
  user: Pick<User, "id" | "name" | "email" | "avatar_url">;
};

// ===== Join / Extended Types =====

export type MemberWithUser = Member & {
  user: Pick<User, "id" | "name" | "email" | "avatar_url">;
};

export type ProjectWithMembers = Project & {
  project_members: (ProjectMember & {
    user: Pick<User, "id" | "name" | "avatar_url">;
  })[];
};

export type ScheduleWithRsvps = Schedule & {
  schedule_rsvps: (ScheduleRsvp & {
    user: Pick<User, "id" | "name" | "avatar_url">;
  })[];
};

export type TaskWithAssignee = Task & {
  assignee: Pick<User, "id" | "name" | "avatar_url"> | null;
};

// ===== 동아리 게시판 =====

export type ClubBoardPost = {
  id: string;
  club_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ClubBoardPostWithAuthor = ClubBoardPost & {
  author: Pick<User, "id" | "name" | "avatar_url">;
};

// ===== 광장 (익명 게시판) =====

export type PlazaPost = {
  id: string;
  body: string;
  created_at: string;
};

// ===== 프로젝트 일정 투표 =====

export type ProjectScheduleDate = {
  id: string;
  project_id: string;
  date: string;
  label: string | null;
  sort_order: number;
  created_at: string;
};

export type AvailabilityStatus = "available" | "unavailable" | "maybe";

export type TimeSlot = {
  start: string;
  end: string;
};

export type ProjectAvailabilityVote = {
  id: string;
  schedule_date_id: string;
  user_id: string;
  status: AvailabilityStatus;
  time_slots: TimeSlot[];
  note: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAvailabilityVoteWithUser = ProjectAvailabilityVote & {
  user: Pick<User, "id" | "name" | "avatar_url">;
};

export type ProjectScheduleDateWithVotes = ProjectScheduleDate & {
  votes: ProjectAvailabilityVoteWithUser[];
};

// ===== 크루 멤버 =====

export type CrewMemberRole = "owner" | "admin" | "member";

export type CrewMember = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: CrewMemberRole;
  is_active: boolean;
  joined_at: string;
  created_at: string;
};

// ===== API Response Types =====

export type ApiResponse<T> = { data: T } | { error: string };

// ===== Form Input Types =====

export type ClubFormData = {
  name: string;
  description?: string;
  category: string;
  max_members: number;
  is_recruiting: boolean;
};

export type ScheduleFormData = {
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at: string;
};

export type ProjectFormData = {
  name: string;
  description?: string;
  status: ProjectStatus;
  starts_at?: string;
  ends_at?: string;
  participation_fee?: number;
  recruitment_start_at?: string;
  recruitment_deadline_at?: string;
  schedule_undecided?: boolean;
  poster_url?: string;
  visibility?: "club_only" | "public";
  schedule_dates?: string[];
};

export type TaskFormData = {
  title: string;
  description?: string;
  status: TaskStatus;
  assignee_id?: string;
  due_date?: string;
};
