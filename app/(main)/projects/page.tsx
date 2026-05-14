import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ProjectsList, type ProjectRow } from "./ProjectsList";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createServerSupabaseClient();

  // 1차: projects_with_range 뷰 (pay_type 포함).
  // 2차: projects 테이블 (pay_type 포함).
  // 3차: projects 테이블 (pay_type 없이) — 007 마이그레이션 미적용 환경 대응.
  // 어느 단계든 성공하면 다음 단계 스킵.
  type Raw = Omit<ProjectRow, "start_date"> & { start_date?: string | null };
  let rows: Raw[] = [];

  const viewQuery = await supabase
    .from("projects_with_range")
    .select(
      "id, title, status, type, poster_url, start_date, pay_type, fee, venue, max_participants"
    )
    .order("created_at", { ascending: false });

  if (!viewQuery.error) {
    rows = (viewQuery.data ?? []) as Raw[];
  } else {
    console.error(
      "[projects] view query failed, falling back to projects table:",
      viewQuery.error
    );

    // 2차: projects + schedule_dates 병렬 (pay_type 포함)
    const [projResA, datesRes] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, title, status, type, poster_url, pay_type, fee, venue, max_participants, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("schedule_dates").select("project_id, date"),
    ]);

    type ProjRow = Omit<ProjectRow, "start_date"> & { created_at?: string };
    let projData: ProjRow[] = (projResA.data ?? []) as ProjRow[];

    // 3차: pay_type 컬럼이 없는 환경에서는 재시도 (pay_type 없이)
    if (projResA.error) {
      console.error(
        "[projects] fallback with pay_type failed, retrying without pay_type:",
        projResA.error
      );
      const retry = await supabase
        .from("projects")
        .select(
          "id, title, status, type, poster_url, fee, venue, max_participants, created_at"
        )
        .order("created_at", { ascending: false });
      if (retry.error) {
        console.error("[projects] final fallback failed:", retry.error);
        projData = [];
      } else {
        const data = (retry.data ?? []) as Array<Omit<ProjRow, "pay_type">>;
        projData = data.map(p => ({ ...p, pay_type: null }));
      }
    }

    const minDateByProject = new Map<string, string>();
    for (const d of (datesRes.data ?? []) as {
      project_id: string;
      date: string;
    }[]) {
      const prev = minDateByProject.get(d.project_id);
      if (!prev || d.date < prev) minDateByProject.set(d.project_id, d.date);
    }
    rows = projData.map(p => ({
      ...p,
      start_date: minDateByProject.get(p.id) ?? null,
    }));
  }

  const all: ProjectRow[] = rows.map(r => ({
    id: r.id,
    title: r.title,
    status: r.status,
    type: r.type,
    poster_url: r.poster_url,
    start_date: r.start_date ?? null,
    pay_type: r.pay_type ?? null,
    fee: r.fee,
    venue: r.venue,
    max_participants: r.max_participants,
  }));

  // 현재 사용자가 지원한 프로젝트별 미투표 일정 수 계산
  const unvotedByProject: Record<string, number> = {};
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: myApps } = await supabase
      .from("project_applications")
      .select("project_id, status")
      .eq("user_id", user.id)
      .neq("status", "rejected");

    const myProjectIds = ((myApps ?? []) as Array<{ project_id: string }>)
      .map(a => a.project_id);

    if (myProjectIds.length > 0) {
      const { data: dateRows } = await supabase
        .from("schedule_dates")
        .select("id, project_id")
        .in("project_id", myProjectIds);

      const dateIds = ((dateRows ?? []) as Array<{ id: string }>).map(d => d.id);
      const votedSet = new Set<string>();
      if (dateIds.length > 0) {
        const { data: voteRows } = await supabase
          .from("schedule_votes")
          .select("schedule_date_id")
          .eq("user_id", user.id)
          .in("schedule_date_id", dateIds);
        for (const v of (voteRows ?? []) as Array<{ schedule_date_id: string }>) {
          votedSet.add(v.schedule_date_id);
        }
      }
      for (const d of (dateRows ?? []) as Array<{ id: string; project_id: string }>) {
        if (!votedSet.has(d.id)) {
          unvotedByProject[d.project_id] = (unvotedByProject[d.project_id] ?? 0) + 1;
        }
      }
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            <span className="serif-tag">All</span>
            프로젝트
          </h1>
          <div className="sub">전체 {all.length}건</div>
        </div>
      </div>

      <ProjectsList projects={all} unvotedByProject={unvotedByProject} />
    </div>
  );
}
