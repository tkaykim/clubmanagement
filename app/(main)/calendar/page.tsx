import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockSchedules, mockClubs } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = createServerSupabaseClient();

  let schedules: { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string; club_id: string }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("schedules")
      .select("id, title, description, location, starts_at, ends_at, club_id")
      .order("starts_at", { ascending: true });
    schedules = data ?? [];
  } else {
    schedules = getMockSchedules().map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      location: s.location,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      club_id: s.club_id,
    }));
  }

  const clubByName = Object.fromEntries(mockClubs.map((c) => [c.id, c.name]));

  const byDate = schedules.reduce<Record<string, typeof schedules>>((acc, s) => {
    const date = s.starts_at ? new Date(s.starts_at).toISOString().slice(0, 10) : "";
    if (!date) return acc;
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(byDate).sort();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">캘린더</h1>
      <p className="text-muted-foreground">동아리 일정을 확인하세요.</p>

      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground">
            이번 주 일정이 없습니다.
          </p>
        ) : (
          sortedDates.map((date) => (
            <section key={date} className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-lg font-semibold text-foreground">
                {new Date(date).toLocaleDateString("ko-KR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h2>
              <ul className="mt-3 space-y-2">
                {(byDate[date] ?? []).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-baseline gap-2 rounded border border-border bg-muted/30 p-3">
                    <span className="font-medium">{s.title}</span>
                    {s.club_id && clubByName[s.club_id] && (
                      <span className="text-sm text-muted-foreground">{clubByName[s.club_id]}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {s.starts_at && new Date(s.starts_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      {s.ends_at && ` - ${new Date(s.ends_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
                    </span>
                    {s.location && <span className="text-sm text-muted-foreground">· {s.location}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
