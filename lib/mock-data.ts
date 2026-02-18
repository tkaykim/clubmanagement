/**
 * Supabase 미연결 시 체험용 목 데이터.
 * 배포/로컬에서 env 없이 동작하도록 사용합니다.
 */

const CLUB_1 = "11111111-1111-1111-1111-111111111101";
const CLUB_2 = "11111111-1111-1111-1111-111111111102";
const CLUB_3 = "11111111-1111-1111-1111-111111111103";

const PROJECT_1 = "22222222-2222-2222-2222-222222222201";
const PROJECT_2 = "22222222-2222-2222-2222-222222222202";
const PROJECT_3 = "22222222-2222-2222-2222-222222222203";
const PROJECT_4 = "22222222-2222-2222-2222-222222222204";

const nextMonth = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
})();
const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();
const nextWeek = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
})();
const nextWeekEnd = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(21, 0, 0, 0);
  return d.toISOString();
})();

export const mockClubs = [
  {
    id: CLUB_1,
    name: "힙합 크루 동아리",
    description: "힙합과 스트릿 댄스에 관심 있는 분들 모집합니다. 정기 공연과 영상 촬영 프로젝트를 진행해요.",
    category: "댄스",
    max_members: 30,
    is_recruiting: true,
    recruitment_deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: CLUB_2,
    name: "캠퍼스 밴드",
    description: "밴드 연주와 정기 공연을 함께할 멤버를 찾습니다. 재즈, 록, 인디 등 다양한 장르 환영.",
    category: "밴드",
    max_members: 20,
    is_recruiting: true,
    recruitment_deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: CLUB_3,
    name: "러닝 크루",
    description: "주말 마라톤·러닝 모임입니다. 초보자도 환영합니다.",
    category: "운동",
    max_members: 50,
    is_recruiting: false,
    recruitment_deadline_at: null as string | null,
  },
];

export const mockProjects = [
  {
    id: PROJECT_1,
    club_id: CLUB_1,
    name: "3월 정기 공연",
    description: "힙합 크루 3월 정기 공연입니다. 관람 신청 받습니다.",
    status: "scheduled",
    starts_at: nextMonth,
    ends_at: nextMonth,
    visibility: "public",
    project_type: "free",
    poster_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
    recruitment_deadline_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: PROJECT_2,
    club_id: CLUB_1,
    name: "댄스 영상 촬영",
    description: "대관·촬영·편집 일정이 있는 프로젝트입니다.",
    status: "in_progress",
    starts_at: new Date().toISOString().slice(0, 10),
    ends_at: nextMonth,
    visibility: "club_only",
    project_type: "free",
    poster_url: null as string | null,
    recruitment_deadline_at: null as string | null,
  },
  {
    id: PROJECT_3,
    club_id: CLUB_2,
    name: "봄 정기 공연",
    description: "캠퍼스 밴드 봄 정기 공연. 많은 관람 부탁드려요.",
    status: "scheduled",
    starts_at: nextMonth,
    ends_at: nextMonth,
    visibility: "public",
    project_type: "paid",
    poster_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
    recruitment_deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: PROJECT_4,
    club_id: CLUB_1,
    name: "2월 워크숍",
    description: "지난 워크숍 프로젝트 (종료).",
    status: "completed",
    starts_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ends_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    visibility: "club_only",
    project_type: "free",
    poster_url: null as string | null,
    recruitment_deadline_at: null as string | null,
  },
];

export const mockSchedules = [
  {
    id: "33333333-3333-3333-3333-333333333301",
    club_id: CLUB_1,
    title: "정기 연습",
    description: "주간 정기 연습",
    location: "학생회관 301",
    starts_at: nextWeek,
    ends_at: nextWeekEnd,
  },
];

export function getMockClubById(id: string) {
  return mockClubs.find((c) => c.id === id) ?? null;
}

export function getMockProjectById(id: string) {
  return mockProjects.find((p) => p.id === id) ?? null;
}

export function getMockProjectsByClubId(clubId: string) {
  return mockProjects.filter((p) => p.club_id === clubId);
}

export function getMockPublicProjects() {
  return mockProjects.filter((p) => p.visibility === "public");
}

export function getMockUpcomingProjects() {
  return mockProjects.filter((p) =>
    ["planning", "scheduled", "in_progress", "ongoing"].includes(p.status)
  );
}

export function getMockSchedulesByClubId(clubId: string) {
  return mockSchedules.filter((s) => s.club_id === clubId);
}

export function getMockSchedules() {
  return mockSchedules;
}

export function getMockMembersCountByClubId(_clubId: string) {
  return 3;
}
