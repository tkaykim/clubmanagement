import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mockClubs } from "@/lib/mock-data";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users } from "lucide-react";

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
    <div className="flex flex-col">
      <MobileHeader title="동아리" />
      <div className="flex-1 px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          관심 있는 동아리를 찾아보세요.
        </p>
        <div className="space-y-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`}>
              <Card className="overflow-hidden border-0 bg-card shadow-sm transition-shadow active:shadow-md">
                <CardContent className="flex flex-row items-center gap-4 p-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="size-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{club.category}</p>
                    <h2 className="mt-0.5 font-semibold text-foreground">{club.name}</h2>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {club.is_recruiting && (
                        <Badge variant="secondary" className="text-xs">모집 중</Badge>
                      )}
                      {club.recruitment_deadline_at && (
                        <span className="text-xs text-muted-foreground">
                          마감 {new Date(club.recruitment_deadline_at).toLocaleDateString("ko-KR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
