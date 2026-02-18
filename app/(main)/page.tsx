import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mockClubs, getMockPublicProjects } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";

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
    clubs = mockClubs.slice(0, 3).map((c) => ({ id: c.id, name: c.name, description: c.description, category: c.category, is_recruiting: c.is_recruiting }));
    events = getMockPublicProjects().slice(0, 4).map((p) => ({ id: p.id, name: p.name, description: p.description, poster_url: p.poster_url, starts_at: p.starts_at }));
  }

  return (
    <div className="flex flex-col">
      {/* 히어로 */}
      <section className="px-5 pt-6 pb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">동아리 플랫폼</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          안녕하세요,
          <br />
          <span className="text-primary">동아리</span>와 함께해요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          동아리를 탐색하고, 공개 이벤트를 확인해 보세요.
        </p>
      </section>

      {/* 추천 동아리 */}
      <section className="px-4 pb-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-foreground">추천 동아리</h2>
          <Link href="/clubs" className="flex items-center gap-0.5 text-sm font-medium text-primary">
            전체보기 <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`}>
              <Card className="overflow-hidden border-0 bg-card shadow-sm transition-shadow active:shadow-md">
                <CardContent className="flex flex-row items-center gap-4 p-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="size-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{club.category}</p>
                    <h3 className="mt-0.5 font-semibold text-foreground">{club.name}</h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{club.description}</p>
                    {club.is_recruiting && (
                      <Badge variant="secondary" className="mt-2 text-xs">모집 중</Badge>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 공개 이벤트 */}
      <section className="px-4 pb-8">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-foreground">공개 이벤트</h2>
          <Link href="/events" className="flex items-center gap-0.5 text-sm font-medium text-primary">
            전체보기 <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {events.map((ev) => (
            <Link key={ev.id} href={`/events/${ev.id}`} className="w-[72%] shrink-0 sm:w-[280px]">
              <Card className="overflow-hidden border-0 shadow-sm transition-shadow active:shadow-md">
                {ev.poster_url ? (
                  <img src={ev.poster_url} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="aspect-[4/3] w-full bg-muted" />
                )}
                <CardContent className="p-3">
                  <h3 className="line-clamp-1 font-medium text-foreground">{ev.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ev.starts_at ? new Date(ev.starts_at).toLocaleDateString("ko-KR") : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-10">
        <Link href="/dashboard">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">체험용 데이터로 둘러보기</p>
              <Button className="mt-3 w-full rounded-xl" size="lg">
                마이 대시 가기
              </Button>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
