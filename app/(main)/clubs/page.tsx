import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ClubsListClient } from "./ClubsListClient";
import type { ClubRow } from "./ClubsListClient";
import type { Interest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const supabase = createServerSupabaseClient();

  let clubs: ClubRow[] = [];
  let interests: Interest[] = [];

  if (supabase) {
    const [clubsRes, clubInterestsRes, interestsRes, universitiesRes] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, name, name_ko, name_en, description, category, max_members, is_recruiting, recruitment_deadline_at, is_university_based, university_id")
        .order("name"),
      supabase.from("club_interests").select("club_id, interest_id"),
      supabase.from("interests").select("id, name, sort_order, created_at").order("sort_order"),
      supabase.from("universities").select("id, name"),
    ]);

    const clubList = clubsRes.data ?? [];
    const ciList = clubInterestsRes.data ?? [];
    const interestList = (interestsRes.data ?? []) as Interest[];
    const universityList = (universitiesRes.data ?? []) as { id: string; name: string }[];
    const universityByName = new Map(universityList.map((u) => [u.id, u.name]));

    const interestIdsByClub = new Map<string, string[]>();
    for (const row of ciList) {
      const arr = interestIdsByClub.get(row.club_id) ?? [];
      arr.push(row.interest_id);
      interestIdsByClub.set(row.club_id, arr);
    }

    clubs = clubList.map((c) => ({
      ...c,
      name_ko: c.name_ko ?? null,
      name_en: c.name_en ?? null,
      recruitment_deadline_at: c.recruitment_deadline_at ?? null,
      is_university_based: c.is_university_based ?? false,
      university_id: c.university_id ?? null,
      university_name: c.university_id ? universityByName.get(c.university_id) ?? null : null,
      interest_ids: interestIdsByClub.get(c.id) ?? [],
    }));
    interests = interestList;
  }

  return <ClubsListClient clubs={clubs} interests={interests} />;
}
