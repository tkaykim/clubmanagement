import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { AuthLinks } from "@/components/auth/AuthLinks";
import { DashboardMyClubs } from "@/components/dashboard/DashboardMyClubs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CalendarClock, UserPlus } from "lucide-react";

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
  }

  const recruitingClubs = clubs.filter((c) => c.is_recruiting).map((c) => ({ id: c.id, name: c.name, category: c.category }));

  return (
    <div className="flex flex-col">
      <MobileHeader title="마이" />
      <div className="flex-1 px-4 py-4">
        <div className="mb-4 flex justify-end">
          <AuthLinks />
        </div>
        {/* 내 동아리: 가입한 동아리만 표시, 리더 칩으로 구분 */}
        <DashboardMyClubs />

        {/* 현재 모집 중인 동아리 (전체 공고) */}
        <section className="mb-6 rounded-xl bg-muted/30 px-3 py-4">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="size-4" />
            현재 모집 중인 동아리
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">지금 회원을 모집하는 동아리입니다.</p>
          {recruitingClubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">모집 중인 동아리가 없습니다.</p>
          ) : (
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
          )}
        </section>

        {/* 모집/진행 중 프로젝트 */}
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="size-4" />
            모집·진행 중
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">동아리별 프로젝트 모집 및 진행 일정입니다.</p>
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
      </div>
    </div>
  );
}
