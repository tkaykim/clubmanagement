import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { CalendarDateMap, CalendarEvent } from "@/lib/types";
import { dateKey } from "@/lib/utils";

/**
 * 캘린더 월별 이벤트 조회 (approved 프로젝트 기준, 사용자 투표 상태 포함)
 * month: "YYYY-MM"
 */
export async function getMemberCalendar(
  userId: string,
  month: string
): Promise<CalendarDateMap> {
  const supabase = createServerSupabaseClient();

  // 해당 월 범위 계산
  const [year, mon] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = `${year}-${String(mon + 1).padStart(2, "0")}-01`;

  // 해당 월 schedule_dates 조회 (approved 프로젝트)
  const { data: dates, error } = await supabase
    .from("schedule_dates")
    .select(
      `
      id, date, label, kind, project_id,
      project:projects(id, title, type, venue, status)
    `
    )
    .gte("date", startDate)
    .lt("date", endDate)
    .in(
      "project_id",
      // approved 지원이 있는 프로젝트만
      (
        await supabase
          .from("project_applications")
          .select("project_id")
          .eq("user_id", userId)
          .eq("status", "approved")
      ).data?.map((a: { project_id: string }) => a.project_id) ?? []
    );

  if (error || !dates) return {};

  // 투표 상태 조회
  const { data: votes } = await supabase
    .from("schedule_votes")
    .select("schedule_date_id, status")
    .eq("user_id", userId)
    .in("schedule_date_id", (dates as { id: string }[]).map((d) => d.id));

  const voteMap: Record<string, string> = {};
  for (const v of votes ?? []) {
    voteMap[v.schedule_date_id] = v.status;
  }

  const result: CalendarDateMap = {};
  for (const d of dates) {
    const key = dateKey(d.date);
    if (!result[key]) result[key] = [];
    type ProjectRef = {
      id: string;
      title: string;
      type: string;
      venue: string | null;
      status: string;
    };
    const project = (d as unknown as { project: ProjectRef | null }).project;
    result[key].push({
      title: project?.title ?? "",
      kind: d.kind,
      label: d.label,
      application_status: "approved",
      project_id: d.project_id,
      project_type: (project?.type ?? "paid_gig") as CalendarEvent["project_type"],
      venue: project?.venue ?? null,
    });
  }

  return result;
}
