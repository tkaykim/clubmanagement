import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  mockClubs,
  getMockPublicProjects,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  let clubs: { id: string; name: string; description: string | null; category: string; is_recruiting: boolean }[] = [];
  let events: { id: string; name: string; description: string | null; poster_url: string | null; starts_at: string | null }[] = [];

  if (supabase) {
    const [clubsRes, eventsRes] = await Promise.all([
      supabase.from("clubs").select("id, name, description, category, is_recruiting").limit(3).order("created_at", { ascending: false }),
      supabase.from("projects").select("id, name, description, poster_url, starts_at, visibility").eq("visibility", "public").limit(4),
    ]);
    clubs = clubsRes.data ?? [];
    events = eventsRes.data ?? [];
  } else {
    clubs = mockClubs.slice(0, 3).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      is_recruiting: c.is_recruiting,
    }));
    events = getMockPublicProjects().slice(0, 4).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      poster_url: p.poster_url,
      starts_at: p.starts_at,
    }));
  }

  return (
    <div className="space-y-12">
      <section>
        <h1 className="mb-2 text-2xl font-bold text-foreground">동아리 플랫폼에 오신 걸 환영합니다</h1>
        <p className="text-muted-foreground">
          동아리를 탐색하고, 공개 이벤트를 확인하고, 체험 대시에서 모집 중인 프로젝트를 살펴보세요.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">추천 동아리</h2>
          <Link href="/clubs" className="text-sm text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/clubs/${club.id}`}
              className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <span className="text-xs text-muted-foreground">{club.category}</span>
              <h3 className="mt-1 font-medium">{club.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
              {club.is_recruiting && (
                <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">모집 중</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">공개 이벤트</h2>
          <Link href="/events" className="text-sm text-primary hover:underline">
            전체 보기
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
            >
              {ev.poster_url ? (
                <img src={ev.poster_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-muted" />
              )}
              <div className="p-3">
                <h3 className="font-medium">{ev.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{ev.starts_at ? new Date(ev.starts_at).toLocaleDateString("ko-KR") : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-muted-foreground">체험용 데이터로 동아리·이벤트를 둘러보실 수 있습니다.</p>
        <Link href="/dashboard" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          체험 대시 가기
        </Link>
      </section>
    </div>
  );
}
