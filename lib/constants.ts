export const CLUB_CATEGORIES = [
  "개발",
  "디자인",
  "음악",
  "운동",
  "독서",
  "봉사",
  "학술",
  "일반",
] as const;

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: "동아리장",
  admin: "운영진",
  member: "회원",
};

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: "기획 중",
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  done: "완료",
};

export const RSVP_STATUS_LABELS: Record<string, string> = {
  attending: "참석",
  declined: "불참",
  pending: "미응답",
};
