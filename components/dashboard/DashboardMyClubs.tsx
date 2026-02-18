"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LayoutDashboard, Crown } from "lucide-react";

type Club = { id: string; name: string; category: string; is_recruiting: boolean };
type Membership = { club_id: string; role: string };

export function DashboardMyClubs() {
  const [clubsWithRole, setClubsWithRole] = useState<{ club: Club; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      const { data: memberships } = await supabase
        .from("members")
        .select("club_id, role")
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (cancelled || !memberships?.length) {
        setClubsWithRole([]);
        setLoading(false);
        return;
      }

      const clubIds = [...new Set(memberships.map((m) => m.club_id))];
      const { data: clubs } = await supabase
        .from("clubs")
        .select("id, name, category, is_recruiting")
        .in("id", clubIds);

      if (cancelled) return;
      const clubMap = new Map((clubs ?? []).map((c) => [c.id, c]));
      const withRole: { club: Club; role: string }[] = [];
      for (const m of memberships as Membership[]) {
        const club = clubMap.get(m.club_id);
        if (club) withRole.push({ club, role: m.role });
      }
      setClubsWithRole(withRole);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutDashboard className="size-4" />
          내 동아리
        </h2>
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </section>
    );
  }

  if (!signedIn) {
    return (
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutDashboard className="size-4" />
          내 동아리
        </h2>
        <Card className="border-dashed border-border/80 bg-muted/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">로그인하면 가입한 동아리 목록이 여기에 표시됩니다.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <LayoutDashboard className="size-4" />
        내 동아리
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">가입한 동아리만 표시됩니다.</p>
      {clubsWithRole.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">가입한 동아리가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clubsWithRole.map(({ club, role }) => (
            <Link key={club.id} href={`/clubs/${club.id}`}>
              <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                <CardContent className="flex flex-row items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{club.category}</p>
                    <p className="font-medium text-foreground">{club.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {role === "owner" && (
                      <Badge className="gap-1 bg-amber-500/90 text-xs text-white hover:bg-amber-500">
                        <Crown className="size-3" />
                        리더
                      </Badge>
                    )}
                    {club.is_recruiting && (
                      <Badge variant="secondary" className="text-xs">모집 중</Badge>
                    )}
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
