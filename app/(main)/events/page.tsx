import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockPublicProjects } from "@/lib/mock-data";

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
  } else {
    events = getMockPublicProjects().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      poster_url: p.poster_url,
      starts_at: p.starts_at,
      ends_at: p.ends_at,
      project_type: p.project_type,
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">공개 이벤트</h1>
      <p className="text-muted-foreground">로그인 없이 누구나 볼 수 있는 공개 프로젝트·공연입니다.</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
          >
            {ev.poster_url ? (
              <img src={ev.poster_url} alt="" className="h-48 w-full object-cover" />
            ) : (
              <div className="h-48 w-full bg-muted" />
            )}
            <div className="p-4">
              <span className="text-xs text-muted-foreground">{typeLabel[ev.project_type] ?? ev.project_type}</span>
              <h2 className="mt-1 text-lg font-semibold">{ev.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ev.description}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {ev.starts_at && new Date(ev.starts_at).toLocaleDateString("ko-KR")}
                {ev.ends_at && ev.ends_at !== ev.starts_at ? ` ~ ${new Date(ev.ends_at).toLocaleDateString("ko-KR")}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
