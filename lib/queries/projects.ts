import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  Project,
  ProjectWithDates,
  ScheduleDate,
  ProjectApplication,
  ApplicationWithMember,
} from "@/lib/types";

export type ProjectFilter = {
  status?: string;
  type?: string;
  search?: string;
};

/**
 * 프로젝트 목록 조회 (필터 지원)
 */
export async function getProjects(
  filter: ProjectFilter = {}
): Promise<ProjectWithDates[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("projects")
    .select(
      `*, schedule_dates(*), project_applications(id, status)`
    )
    .order("created_at", { ascending: false });

  if (filter.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }
  if (filter.type && filter.type !== "all") {
    query = query.eq("type", filter.type);
  }
  if (filter.search) {
    query = query.ilike("title", `%${filter.search}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((p) => {
    const apps = (p.project_applications ?? []) as { id: string; status: string }[];
    return {
      ...p,
      schedule_dates: (p.schedule_dates ?? []) as ScheduleDate[],
      _application_count: apps.length,
      _confirmed_count: apps.filter((a: { id: string; status: string }) => a.status === "approved").length,
    } as ProjectWithDates;
  });
}

/**
 * 프로젝트 상세 조회 (일정 날짜 + 지원자 + 공지 포함)
 */
export async function getProjectDetail(id: string): Promise<
  | (Project & {
      schedule_dates: ScheduleDate[];
      applications: ApplicationWithMember[];
      _application_count: number;
      _confirmed_count: number;
    })
  | null
> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      schedule_dates(*),
      project_applications(
        *,
        crew_member:crew_members(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const apps = (data.project_applications ?? []) as ApplicationWithMember[];
  return {
    ...data,
    schedule_dates: (data.schedule_dates ?? []) as ScheduleDate[],
    applications: apps,
    _application_count: apps.length,
    _confirmed_count: apps.filter((a) => a.status === "approved").length,
  };
}

/**
 * 특정 사용자의 지원 이력 조회 (프로젝트 정보 포함)
 */
export async function getMyApplications(
  userId: string
): Promise<(ProjectApplication & { project: Project | null })[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("project_applications")
    .select(`*, project:projects(*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as (ProjectApplication & { project: Project | null })[];
}

/**
 * 가용성 매트릭스용 전체 votes 조회 (projectId 기준)
 */
export async function getAvailabilityMatrix(projectId: string): Promise<{
  schedule_dates: ScheduleDate[];
  votes: {
    schedule_date_id: string;
    user_id: string;
    status: string;
    time_slots: unknown[];
    note: string | null;
  }[];
}> {
  const supabase = createServerSupabaseClient();

  const [datesResult, votesResult] = await Promise.all([
    supabase
      .from("schedule_dates")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order"),
    supabase
      .from("schedule_votes")
      .select("schedule_date_id, user_id, status, time_slots, note")
      .in(
        "schedule_date_id",
        // 서브쿼리 대신 두 쿼리로 분리
        (
          await supabase
            .from("schedule_dates")
            .select("id")
            .eq("project_id", projectId)
        ).data?.map((d: { id: string }) => d.id) ?? []
      ),
  ]);

  return {
    schedule_dates: (datesResult.data ?? []) as ScheduleDate[],
    votes: (votesResult.data ?? []) as {
      schedule_date_id: string;
      user_id: string;
      status: string;
      time_slots: unknown[];
      note: string | null;
    }[],
  };
}

/**
 * 가용성 프리셋 목록 조회 (userId 기준)
 */
export async function getAvailabilityPresets(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("availability_presets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  return data ?? [];
}
