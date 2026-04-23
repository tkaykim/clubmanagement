import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PublicHeader } from "@/components/portfolio/PublicHeader";
import { PublicFooter } from "@/components/portfolio/PublicFooter";
import type { PortfolioSection, PublicCrewMember, PortfolioMediaWithMembers } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: sections } = await supabase
      .from("portfolio_sections")
      .select("key, value");

    const map: Record<string, string> = {};
    for (const s of sections ?? []) map[s.key] = s.value;

    const heroImage = await supabase
      .from("portfolio_media")
      .select("image_url")
      .eq("kind", "hero_image")
      .eq("is_featured", true)
      .maybeSingle();

    return {
      title: map["hero_title"] ? `${map["hero_title"]} | 원샷크루` : "원샷크루 포트폴리오",
      description: map["hero_subtitle"] || map["about_team"] || "원샷크루 댄스 크루 공식 포트폴리오",
      openGraph: {
        title: map["hero_title"] || "원샷크루",
        description: map["hero_subtitle"] || "원샷크루 댄스 크루",
        images: heroImage.data?.image_url ? [heroImage.data.image_url] : [],
      },
    };
  } catch {
    return { title: "원샷크루 포트폴리오" };
  }
}

export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();

  let contactEmail = "";
  let contactPhone = "";
  let members: PublicCrewMember[] = [];
  const mediaMap: Record<string, PortfolioMediaWithMembers> = {};

  try {
    // Only fetch the two contact fields needed for header/footer display.
    // Members and media are also needed for InquiryDialog in header/footer.
    // Portfolio sections (hero_title, about_team, etc.) are fetched in page.tsx.
    const [sectionsRes, membersRes, mediaRes] = await Promise.all([
      supabase
        .from("portfolio_sections")
        .select("key, value")
        .in("key", ["contact_email", "contact_phone"]),
      supabase
        .from("public_crew_members_view")
        .select("id, stage_name, name, position, profile_image_url, public_bio, specialties, is_public, is_active, joined_month")
        .eq("is_active", true)
        .eq("is_public", true),
      supabase
        .from("portfolio_media")
        .select("id, kind, title, thumbnail_url, youtube_url, image_url, description, sort_order, is_featured, event_date, venue, created_at, updated_at, created_by"),
    ]);

    const sectionRows = (sectionsRes.data ?? []) as Pick<PortfolioSection, "key" | "value">[];
    for (const s of sectionRows) {
      if (s.key === "contact_email") contactEmail = s.value;
      if (s.key === "contact_phone") contactPhone = s.value;
    }

    members = (membersRes.data ?? []) as PublicCrewMember[];

    for (const m of (mediaRes.data ?? [])) {
      mediaMap[m.id] = { ...(m as PortfolioMediaWithMembers), members: [] };
    }
  } catch {
    // silently fail — layout still renders
  }

  return (
    <>
      <PublicHeader
        contactEmail={contactEmail}
        members={members}
        mediaMap={mediaMap}
      />
      <main>{children}</main>
      <PublicFooter
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        members={members}
        mediaMap={mediaMap}
      />
    </>
  );
}
