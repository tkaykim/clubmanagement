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
    .select(`*, schedule_dates(*)`)
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

  const projectIds = data.map((p) => p.id);
  const countMap = await getApplicationCountsMap(projectIds);

  return data.map((p) => {
    const c = countMap.get(p.id) ?? { total: 0, approved: 0, pending: 0, rejected: 0 };
    return {
      ...p,
      schedule_dates: (p.schedule_dates ?? []) as ScheduleDate[],
      _application_count: c.total,
      _confirmed_count: c.approved,
    } as ProjectWithDates;
  });
}

/**
 * 지원자 카운트 맵 조회 (RLS 우회 SECURITY DEFINER 함수)
 * — 일반 사용자도 카드 숫자는 볼 수 있다. 지원 "내용" 은 여전히 RLS 로 보호됨.
 */
export async function getApplicationCountsMap(
  projectIds: string[]
): Promise<Map<string, { total: number; approved: number; pending: number; rejected: number }>> {
  const map = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();
  if (projectIds.length === 0) return map;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_project_application_counts", {
    p_project_ids: projectIds,
  });

  if (error || !data) return map;

  for (const row of data as Array<{
    project_id: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }>) {
    map.set(row.project_id, {
      total: Number(row.total) || 0,
      approved: Number(row.approved) || 0,
      pending: Number(row.pending) || 0,
      rejected: Number(row.rejected) || 0,
    });
  }
  return map;
}

/**
 * 단일 프로젝트 지원자 카운트
 */
export async function getApplicationCount(projectId: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc("get_project_application_count", {
    p_project_id: projectId,
  });
  const row = (data?.[0] ?? { total: 0, approved: 0, pending: 0, rejected: 0 }) as {
    total: number; approved: number; pending: number; rejected: number;
  };
  return {
    total: Number(row.total) || 0,
    approved: Number(row.approved) || 0,
    pending: Number(row.pending) || 0,
    rejected: Number(row.rejected) || 0,
  };
}

/**
 * 프로젝트 상세 조회 (일정 날짜 + 지원자 + 공지 포함)
 *
 * NOTE: project_applications.user_id 는 users(id) FK 이므로
 * PostgREST nested embed `crew_members(*)` 는 자동 관계 감지에 실패한다.
 * 별도 쿼리로 crew_members 를 가져와 user_id 기준으로 매칭한다.
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
    .select(`*, schedule_dates(*), project_applications(*)`)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  type RawApp = ApplicationWithMember & { user_id: string | null };
  const rawApps = ((data as { project_applications?: RawApp[] }).project_applications ?? []) as RawApp[];

  const userIds = Array.from(
    new Set(rawApps.map((a) => a.user_id).filter((v): v is string => !!v))
  );

  const crewMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: crews } = await supabase
      .from("crew_members")
      .select("*")
      .in("user_id", userIds);
    for (const c of (crews ?? []) as Array<Record<string, unknown> & { user_id: string }>) {
      crewMap.set(c.user_id, c);
    }
  }

  const applications = rawApps.map((a) => ({
    ...a,
    crew_member: a.user_id ? crewMap.get(a.user_id) ?? null : null,
  })) as ApplicationWithMember[];

  const counts = await getApplicationCount(id);
  return {
    ...data,
    schedule_dates: (data.schedule_dates ?? []) as ScheduleDate[],
    applications,
    _application_count: counts.total,
    _confirmed_count: counts.approved,
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
