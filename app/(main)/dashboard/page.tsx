import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mockClubs, getMockUpcomingProjects, getMockRecruitingClubs } from "@/lib/mock-data";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LayoutDashboard, CalendarClock, UserPlus, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planning: "기획",
  scheduled: "예정",
  in_progress: "진행 중",
  ongoing: "진행 중",
};

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  let clubs: { id: string; name: string; category: string; is_recruiting: boolean }[] = [];
  let projects: { id: string; name: string; status: string; recruitment_deadline_at: string | null; club_id: string }[] = [];
  let clubByName: Record<string, string> = {};

  if (supabase) {
    const [clubsRes, projectsRes] = await Promise.all([
      supabase.from("clubs").select("id, name, category, is_recruiting").order("name"),
      supabase.from("projects").select("id, name, status, recruitment_deadline_at, club_id").in("status", ["planning", "scheduled", "in_progress", "ongoing"]).order("recruitment_deadline_at", { ascending: true, nullsFirst: false }),
    ]);
    clubs = clubsRes.data ?? [];
    projects = projectsRes.data ?? [];
    const clubIds = [...new Set(projects.map((p) => p.club_id).filter(Boolean))] as string[];
    const { data: clubList } = await supabase.from("clubs").select("id, name").in("id", clubIds);
    clubByName = Object.fromEntries((clubList ?? []).map((c) => [c.id, c.name]));
  } else {
    clubs = mockClubs.map((c) => ({ id: c.id, name: c.name, category: c.category, is_recruiting: c.is_recruiting }));
    projects = getMockUpcomingProjects().map((p) => ({ id: p.id, name: p.name, status: p.status, recruitment_deadline_at: p.recruitment_deadline_at, club_id: p.club_id }));
    clubByName = Object.fromEntries(mockClubs.map((c) => [c.id, c.name]));
  }

  const recruitingClubs = clubs.filter((c) => c.is_recruiting).map((c) => ({ id: c.id, name: c.name, category: c.category }));

  return (
    <div className="flex flex-col">
      <MobileHeader title="마이" />
      <div className="flex-1 px-4 py-4">
        {/* 모집 중인 동아리 (회원 모집 공고) */}
        {recruitingClubs.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserPlus className="size-4" />
              모집 중인 동아리
            </h2>
            <div className="space-y-2">
              {recruitingClubs.map((c) => (
                <Link key={c.id} href={`/clubs/${c.id}`}>
                  <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                    <CardContent className="flex flex-row items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{c.category}</p>
                        <p className="font-medium text-foreground">{c.name}</p>
                      </div>
                      <Badge className="text-xs">모집 중</Badge>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 내 동아리 */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <LayoutDashboard className="size-4" />
            내 동아리
          </h2>
          <div className="space-y-2">
            {clubs.map((club) => (
              <Link key={club.id} href={`/clubs/${club.id}`}>
                <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                  <CardContent className="flex flex-row items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{club.category}</p>
                      <p className="font-medium text-foreground">{club.name}</p>
                    </div>
                    {club.is_recruiting && <Badge variant="secondary" className="text-xs">모집 중</Badge>}
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 모집/진행 중 프로젝트 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="size-4" />
            모집·진행 중
          </h2>
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={p.club_id ? `/clubs/${p.club_id}` : "/dashboard"}>
                <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                  <CardContent className="p-3">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{clubByName[p.club_id] ?? ""}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{statusLabel[p.status] ?? p.status}</Badge>
                      {p.recruitment_deadline_at && (
                        <span className="text-xs text-muted-foreground">
                          마감 {new Date(p.recruitment_deadline_at).toLocaleDateString("ko-KR")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 관리자 */}
        <section className="mt-8 border-t border-border/60 pt-6">
          <Link href="/admin">
            <Card className="border-0 border-dashed bg-muted/30 shadow-sm transition-colors active:bg-muted/50">
              <CardContent className="flex flex-row items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">관리자</p>
                  <p className="text-xs text-muted-foreground">플랫폼 전체 관리</p>
                </div>
                <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>
    </div>
  );
}
