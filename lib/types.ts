export type UserRole = "owner" | "admin" | "member";

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
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  joined_at: string;
  created_at: string;
};

export type ProjectStatus = "recruiting" | "in_progress" | "completed" | "cancelled";

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  schedule_undecided: boolean;
  fee: number;
  recruitment_start_at: string | null;
  recruitment_end_at: string | null;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleDate = {
  id: string;
  project_id: string;
  date: string;
  label: string | null;
  sort_order: number;
  created_at: string;
};

export type VoteStatus = "available" | "unavailable" | "maybe";

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

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type ProjectApplication = {
  id: string;
  project_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: ApplicationStatus;
  answers: Record<string, unknown>;
  created_at: string;
};

export type FormFieldType = "short_text" | "long_text" | "radio" | "checkbox" | "select";

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
