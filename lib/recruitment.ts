export type RecruitmentWindowProject = {
  status: string;
  recruitment_start_at?: string | null;
  recruitment_end_at?: string | null;
};

export type RecruitmentWindowState = "open" | "upcoming" | "closed" | "unavailable";

export function getRecruitmentWindowState(
  project: RecruitmentWindowProject,
  now: Date = new Date()
): RecruitmentWindowState {
  if (project.status !== "recruiting") return "unavailable";

  const nowMs = now.getTime();
  const startMs = project.recruitment_start_at
    ? Date.parse(project.recruitment_start_at)
    : Number.NEGATIVE_INFINITY;
  const endMs = project.recruitment_end_at
    ? Date.parse(project.recruitment_end_at)
    : Number.POSITIVE_INFINITY;

  if (Number.isFinite(startMs) && nowMs < startMs) return "upcoming";
  if (Number.isFinite(endMs) && nowMs >= endMs) return "closed";
  return "open";
}

export function recruitmentWindowMessage(
  state: RecruitmentWindowState,
  project: RecruitmentWindowProject
): string | null {
  if (state === "upcoming" && project.recruitment_start_at) {
    return `${formatRecruitmentDateTime(project.recruitment_start_at)}에 지원이 열립니다.`;
  }
  if (state === "closed") return "모집이 마감되었습니다.";
  if (state === "unavailable") return "현재 지원을 받지 않는 프로젝트입니다.";
  return null;
}

export function formatRecruitmentDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
