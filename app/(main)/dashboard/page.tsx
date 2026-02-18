import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mockClubs, getMockUpcomingProjects } from "@/lib/mock-data";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">체험 대시</h1>
        <p className="mt-1 text-muted-foreground">체험용 데이터로 동아리·모집 중인 프로젝트를 확인해 보세요.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">내 동아리 (체험용 전체 목록)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/clubs/${club.id}`}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <span className="text-xs text-muted-foreground">{club.category}</span>
              <h3 className="mt-1 font-medium">{club.name}</h3>
              {club.is_recruiting && (
                <span className="mt-2 inline-block text-xs text-primary">모집 중</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">모집 중 / 진행 중인 프로젝트</h2>
        <ul className="mt-3 space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={p.club_id ? `/clubs/${p.club_id}` : "/dashboard"}
                className="block rounded border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">{clubByName[p.club_id] ?? ""}</span>
                <span className="ml-2 text-sm text-muted-foreground">{statusLabel[p.status] ?? p.status}</span>
                {p.recruitment_deadline_at && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    모집 마감 {new Date(p.recruitment_deadline_at).toLocaleDateString("ko-KR")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
