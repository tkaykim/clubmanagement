import { z } from "zod";

export const clubSchema = z.object({
  name: z.string().min(2, "동아리 이름은 2자 이상이어야 합니다"),
  description: z.string().optional(),
  category: z.string().min(1, "카테고리를 선택해주세요"),
  max_members: z.number().int().min(2).max(500).default(50),
  is_recruiting: z.boolean().default(false),
});

export const scheduleSchema = z.object({
  title: z.string().min(1, "일정 제목을 입력해주세요"),
  description: z.string().optional(),
  location: z.string().optional(),
  starts_at: z.string().min(1, "시작 시간을 선택해주세요"),
  ends_at: z.string().min(1, "종료 시간을 선택해주세요"),
});

export const projectSchema = z.object({
  name: z.string().min(1, "프로젝트 이름을 입력해주세요"),
  description: z.string().optional(),
  status: z.enum(["planning", "in_progress", "completed", "cancelled"]).default("planning"),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, "작업 제목을 입력해주세요"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  assignee_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
});

export const memberApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const memberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
