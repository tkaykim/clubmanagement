import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = createServerSupabaseClient();

  let schedules: { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string; club_id: string }[] = [];
  let clubByName: Record<string, string> = {};

  if (supabase) {
    const { data } = await supabase
      .from("schedules")
      .select("id, title, description, location, starts_at, ends_at, club_id")
      .order("starts_at", { ascending: true });
    schedules = data ?? [];
    const clubIds = [...new Set(schedules.map((s) => s.club_id).filter(Boolean))] as string[];
    const { data: clubList } = clubIds.length > 0 ? await supabase.from("clubs").select("id, name").in("id", clubIds) : { data: [] };
    clubByName = Object.fromEntries((clubList ?? []).map((c) => [c.id, c.name]));
  }
  const byDate = schedules.reduce<Record<string, typeof schedules>>((acc, s) => {
    const date = s.starts_at ? new Date(s.starts_at).toISOString().slice(0, 10) : "";
    if (!date) return acc;
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();

  return (
    <div className="flex flex-col">
      <MobileHeader title="캘린더" />
      <div className="flex-1 px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          동아리 일정을 확인하세요.
        </p>
        {sortedDates.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="size-12 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">이번 주 일정이 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {sortedDates.map((date) => (
              <section key={date}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">
                  {new Date(date).toLocaleDateString("ko-KR", { weekday: "long", month: "long", day: "numeric" })}
                </h2>
                <div className="space-y-2">
                  {(byDate[date] ?? []).map((s) => (
                    <Card key={s.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <p className="font-medium text-foreground">{s.title}</p>
                        {s.club_id && clubByName[s.club_id] && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{clubByName[s.club_id]}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {s.starts_at && new Date(s.starts_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            {s.ends_at && ` - ${new Date(s.ends_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" /> {s.location}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
