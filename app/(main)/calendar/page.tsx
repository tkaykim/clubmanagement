import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { CalendarView } from "@/components/calendar/CalendarView";
import {
  prepareCalendarScheduleDates,
  type RawCalendarScheduleDate,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/calendar");

  const [{ data: member }, { data: applications }, { data: rawDates }, { data: votes }] =
    await Promise.all([
      supabase.from("crew_members").select("role").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("project_applications")
        .select("project_id, status")
        .eq("user_id", user.id)
        .eq("status", "approved"),
      supabase
        .from("schedule_dates")
        .select(`
          id, date, label, kind, is_confirmed,
          projects:project_id ( id, title, type, venue, status )
        `)
        .order("date"),
      supabase
        .from("schedule_votes")
        .select("schedule_date_id, status")
        .eq("user_id", user.id),
    ]);

  const isAdmin = member?.role === "admin" || member?.role === "owner";
  const myProjectIds = new Set(
    ((applications ?? []) as Array<{ project_id: string }>).map((row) => row.project_id)
  );
  const voteMap = new Map(
    ((votes ?? []) as Array<{ schedule_date_id: string; status: string }>).map((row) => [
      row.schedule_date_id,
      row.status,
    ])
  );

  const scheduleDates = prepareCalendarScheduleDates(
    (rawDates ?? []) as unknown as RawCalendarScheduleDate[],
    isAdmin,
    myProjectIds,
    voteMap
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{isAdmin ? "일정 캘린더" : "내 참여 일정"}</h1>
          <div className="sub">
            {isAdmin
              ? "확정 일정과 후보 일정을 구분해 확인합니다."
              : "참여가 확정된 프로젝트의 확정 일정과 후보 일정을 함께 표시합니다."}
          </div>
        </div>
      </div>

      <CalendarView scheduleDates={scheduleDates} isAdmin={isAdmin} />
    </div>
  );
}
