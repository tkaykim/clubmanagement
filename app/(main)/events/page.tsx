import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  free: "무료",
  paid: "유료",
  participation_fee: "참가비",
};

export default async function EventsPage() {
  const supabase = createServerSupabaseClient();

  let events: { id: string; name: string; description: string | null; poster_url: string | null; starts_at: string | null; ends_at: string | null; project_type: string }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, description, poster_url, starts_at, ends_at, project_type")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true });
    events = data ?? [];
  }

  return (
    <div className="flex flex-col">
      <MobileHeader title="공개 이벤트" />
      <div className="flex-1 px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          누구나 참여할 수 있는 공개 프로젝트·공연입니다.
        </p>
        <div className="space-y-4">
          {events.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">공개 이벤트가 없습니다.</p>
          )}
          {events.map((ev) => (
            <Link key={ev.id} href={`/events/${ev.id}`}>
              <Card className="overflow-hidden border-0 shadow-sm transition-shadow active:shadow-md">
                {ev.poster_url ? (
                  <img src={ev.poster_url} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="aspect-video w-full bg-muted" />
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="mb-2 text-xs">
                        {typeLabel[ev.project_type] ?? ev.project_type}
                      </Badge>
                      <h2 className="font-semibold text-foreground">{ev.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ev.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {ev.starts_at && new Date(ev.starts_at).toLocaleDateString("ko-KR")}
                        {ev.ends_at && ev.ends_at !== ev.starts_at ? ` ~ ${new Date(ev.ends_at).toLocaleDateString("ko-KR")}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
