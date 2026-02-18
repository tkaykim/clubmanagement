import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClubManageSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
  if (!club) notFound();

  const { data: schedules } = await supabase.from("schedules").select("id, title, starts_at, ends_at, location").eq("club_id", id).order("starts_at", { ascending: true });
  const scheduleList = schedules ?? [];

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {club.name} 일정입니다.
        </p>
        {scheduleList.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <Calendar className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">등록된 일정이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {scheduleList.map((s) => (
              <Card key={s.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    {new Date(s.starts_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(s.ends_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {s.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" /> {s.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
