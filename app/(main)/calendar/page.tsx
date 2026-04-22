import { createServerSupabaseClient } from "@/lib/supabase-server";
import { CalendarView } from "@/components/calendar/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  let scheduleDates: Array<{
    id: string; date: string; label: string | null; kind: string;
    projects: { id: string; title: string; type: string; venue: string | null };
  }> = [];

  let myVotes: Array<{ schedule_date_id: string; status: string }> = [];

  try {
    const { data: sdData } = await supabase
      .from("schedule_dates")
      .select(`
        id, date, label, kind,
        projects:project_id ( id, title, type, venue )
      `)
      .order("date");

    scheduleDates = (sdData ?? []) as unknown as typeof scheduleDates;

    if (user) {
      const { data: vData } = await supabase
        .from("schedule_votes")
        .select("schedule_date_id, status")
        .eq("user_id", user.id);
      myVotes = (vData ?? []) as typeof myVotes;
    }
  } catch {
    // 빈 캘린더
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>내 캘린더</h1>
          <div className="sub">일정 · 가능 여부 확인</div>
        </div>
      </div>

      <CalendarView scheduleDates={scheduleDates} myVotes={myVotes} />
    </div>
  );
}
