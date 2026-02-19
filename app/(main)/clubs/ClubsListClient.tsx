"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Users, Sparkles, Search, Plus } from "lucide-react";
import { getClubDisplayName } from "@/lib/types";
import type { Interest } from "@/lib/types";

export type ClubRow = {
  id: string;
  name: string;
  name_ko: string | null;
  name_en: string | null;
  description: string | null;
  category: string;
  max_members: number;
  is_recruiting: boolean;
  recruitment_deadline_at: string | null;
  is_university_based: boolean;
  university_id: string | null;
  university_name: string | null;
  interest_ids: string[];
};

type Props = {
  clubs: ClubRow[];
  interests: Interest[];
};

export function ClubsListClient({ clubs: initialClubs, interests }: Props) {
  const [search, setSearch] = useState("");
  const [selectedInterestIds, setSelectedInterestIds] = useState<Set<string>>(new Set());
  const [userInterestIds, setUserInterestIds] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (!user) return;
      const { data } = await supabase.from("user_interests").select("interest_id").eq("user_id", user.id);
      setUserInterestIds((data ?? []).map((r) => r.interest_id));
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = initialClubs;
    const q = search.trim().toLowerCase();
    if (q) {
      const display = (c: ClubRow) => getClubDisplayName(c).toLowerCase();
      list = list.filter(
        (c) =>
          display(c).includes(q) ||
          (c.name_ko ?? "").toLowerCase().includes(q) ||
          (c.name_en ?? "").toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }
    if (selectedInterestIds.size > 0) {
      list = list.filter((c) => c.interest_ids.some((id) => selectedInterestIds.has(id)));
    }
    return list;
  }, [initialClubs, search, selectedInterestIds]);

  const recommended = useMemo(() => {
    if (userInterestIds.length === 0) return [];
    return filtered
      .map((c) => ({
        club: c,
        matchCount: c.interest_ids.filter((id) => userInterestIds.includes(id)).length,
      }))
      .filter((x) => x.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map((x) => x.club);
  }, [filtered, userInterestIds]);

  const others = useMemo(() => {
    const recIds = new Set(recommended.map((c) => c.id));
    return filtered.filter((c) => !recIds.has(c.id));
  }, [filtered, recommended]);

  function toggleInterest(id: string) {
    setSelectedInterestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col">
      <MobileHeader
        title="동아리"
        rightSlot={
          isLoggedIn ? (
            <Link href="/clubs/new">
              <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
                <Plus className="size-4" />
                만들기
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="flex-1 px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          관심 있는 동아리를 찾아보세요. 검색·태그로 필터할 수 있어요.
        </p>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            type="search"
            placeholder="동아리명, 소개, 카테고리로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">관심사로 필터</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <Badge
                key={i.id}
                variant={selectedInterestIds.has(i.id) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleInterest(i.id)}
              >
                {i.name}
              </Badge>
            ))}
          </div>
        </div>

        {recommended.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" />
              맞춤 추천
            </h2>
            <div className="space-y-3">
              {recommended.map((club) => (
                <Link key={club.id} href={`/clubs/${club.id}`}>
                  <Card className="overflow-hidden border-0 bg-primary/5 shadow-sm transition-shadow active:shadow-md">
                    <CardContent className="flex flex-row items-center gap-4 p-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Users className="size-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          {club.category}
                          {club.is_university_based && (
                            <span className="ml-1.5">
                              · 대학 기반{club.university_name ? ` · ${club.university_name}` : ""}
                            </span>
                          )}
                        </p>
                        <h2 className="mt-0.5 font-semibold text-foreground">{getClubDisplayName(club)}</h2>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {club.interest_ids.slice(0, 3).map((interestId) => {
                          const name = interests.find((i) => i.id === interestId)?.name;
                          return name ? <Badge key={interestId} variant="secondary" className="text-xs">{name}</Badge> : null;
                        })}
                        {club.is_recruiting && <Badge variant="default" className="text-xs">모집 중</Badge>}
                      </div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          {recommended.length > 0 && <h2 className="mb-3 text-sm font-semibold text-foreground">전체 동아리</h2>}
          <div className="space-y-3">
            {others.map((club) => (
              <Link key={club.id} href={`/clubs/${club.id}`}>
                <Card className="overflow-hidden border-0 bg-card shadow-sm transition-shadow active:shadow-md">
                  <CardContent className="flex flex-row items-center gap-4 p-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Users className="size-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {club.category}
                        {club.is_university_based && (
                          <span className="ml-1.5">
                            · 대학 기반{club.university_name ? ` · ${club.university_name}` : ""}
                          </span>
                        )}
                      </p>
                      <h2 className="mt-0.5 font-semibold text-foreground">{getClubDisplayName(club)}</h2>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {club.interest_ids.slice(0, 3).map((interestId) => {
                          const name = interests.find((i) => i.id === interestId)?.name;
                          return name ? <Badge key={interestId} variant="secondary" className="text-xs">{name}</Badge> : null;
                        })}
                        {club.is_recruiting && <Badge variant="secondary" className="text-xs">모집 중</Badge>}
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
        </section>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            조건에 맞는 동아리가 없어요. 검색어나 필터를 바꿔 보세요.
          </div>
        )}
      </div>
    </div>
  );
}
