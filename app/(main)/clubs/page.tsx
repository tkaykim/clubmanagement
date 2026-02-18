import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mockClubs } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const supabase = createServerSupabaseClient();

  let clubs: { id: string; name: string; description: string | null; category: string; max_members: number; is_recruiting: boolean; recruitment_deadline_at: string | null }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("clubs")
      .select("id, name, description, category, max_members, is_recruiting, recruitment_deadline_at")
      .order("name");
    clubs = data ?? [];
  } else {
    clubs = mockClubs.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      max_members: c.max_members,
      is_recruiting: c.is_recruiting,
      recruitment_deadline_at: c.recruitment_deadline_at,
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">동아리 목록</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <Link
            key={club.id}
            href={`/clubs/${club.id}`}
            className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <span className="text-xs text-muted-foreground">{club.category}</span>
            <h2 className="mt-1 text-lg font-semibold">{club.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {club.is_recruiting && (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">모집 중</span>
              )}
              {club.recruitment_deadline_at && (
                <span className="text-xs text-muted-foreground">
                  마감 {new Date(club.recruitment_deadline_at).toLocaleDateString("ko-KR")}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
