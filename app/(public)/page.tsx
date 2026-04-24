import { createServerSupabaseClient } from "@/lib/supabase-server";
import { HeroSection } from "@/components/portfolio/HeroSection";
import { AboutSection } from "@/components/portfolio/AboutSection";
import { FeaturedVideoSection } from "@/components/portfolio/FeaturedVideoSection";
import { PerformanceVideoSection } from "@/components/portfolio/PerformanceVideoSection";
import { OtherVideoTabs } from "@/components/portfolio/OtherVideoTabs";
import { PhotoGallery } from "@/components/portfolio/PhotoGallery";
import { CareerTimeline } from "@/components/portfolio/CareerTimeline";
// import { MemberCardGrid } from "@/components/portfolio/MemberCardGrid";
import { CtaFooterSection } from "@/components/portfolio/CtaFooterSection";
import type {
  PortfolioSectionKey,
  PublicCrewMember,
  PortfolioMediaWithMembers,
  PortfolioCareerWithMedia,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function PortfolioPage() {
  const supabase = createServerSupabaseClient();

  const sections: Record<string, string> = {};
  let media: PortfolioMediaWithMembers[] = [];
  let careers: PortfolioCareerWithMedia[] = [];
  let members: PublicCrewMember[] = [];

  try {
    const [sectionsRes, mediaRes, careersRes, membersRes] = await Promise.all([
      supabase.from("portfolio_sections").select("key, value"),
      supabase
        .from("portfolio_media")
        .select(`
          id, kind, title, description, image_url, youtube_url, thumbnail_url,
          sort_order, is_featured, event_date, venue, created_by, created_at, updated_at,
          members:portfolio_media_members(
            sort_order,
            crew_member:crew_members(id, stage_name, name, profile_image_url, is_public, is_active)
          )
        `)
        .order("sort_order"),
      supabase
        .from("portfolio_careers")
        .select(`
          id, title, category, event_date, location, description, link_url,
          media_id, sort_order, created_by, created_at, updated_at,
          media:portfolio_media(id, title, thumbnail_url, youtube_url)
        `)
        .order("event_date", { ascending: false }),
      supabase
        .from("public_crew_members_view")
        .select("id, stage_name, name, position, profile_image_url, public_bio, specialties, is_public, is_active, joined_month")
        .eq("is_active", true)
        .eq("is_public", true),
    ]);

    for (const s of sectionsRes.data ?? []) {
      sections[(s as { key: PortfolioSectionKey; value: string }).key] = (s as { key: PortfolioSectionKey; value: string }).value;
    }

    // Normalize portfolio_media_members join shape
    media = ((mediaRes.data ?? []) as unknown[]).map((item) => {
      const m = item as Record<string, unknown>;
      const rawMembers = (m.members as Array<{ crew_member: unknown }> | null) ?? [];
      return {
        ...m,
        members: rawMembers
          .map((pm) => pm.crew_member)
          .filter(Boolean) as PortfolioMediaWithMembers["members"],
      } as PortfolioMediaWithMembers;
    });

    careers = ((careersRes.data ?? []) as unknown as PortfolioCareerWithMedia[]);
    members = ((membersRes.data ?? []) as PublicCrewMember[]);
  } catch {
    // Render empty state on error
  }

  // Build a media map for dialogs
  const mediaMap: Record<string, PortfolioMediaWithMembers> = {};
  for (const m of media) mediaMap[m.id] = m;

  // Extract section values
  const heroTitle = sections["hero_title"] || "원샷크루";
  const heroSubtitle = sections["hero_subtitle"] || "";
  const aboutText = sections["about_team"] || "";
  const genres = sections["genres"] ? sections["genres"].split(",").map((g) => g.trim()).filter(Boolean) : [];
  const contactEmail = sections["contact_email"] || "";

  // Classify media by kind.
  // Hero/Featured 선택 우선순위:
  //   1) 명시적 hero_video/hero_image + is_featured
  //   2) is_featured=true 퍼포먼스/커버 등 어느 kind라도 (대표로 쓸 1개 pick)
  const heroMedia =
    media.find((m) => m.kind === "hero_video" && m.is_featured) ||
    media.find((m) => m.kind === "hero_image" && m.is_featured) ||
    media.find((m) => m.is_featured && !!m.youtube_url) ||
    media.find((m) => m.is_featured) ||
    null;

  // featured 추가분(첫 번째 hero 제외 나머지 is_featured)
  const featuredVideos = media.filter(
    (m) => m.is_featured && !!m.youtube_url && m.id !== heroMedia?.id
  );

  const performanceVideos = media.filter((m) => m.kind === "performance");
  const coverVideos = media.filter((m) => m.kind === "cover");
  const otherVideos = media.filter((m) => m.kind === "other_video");
  const photos = media.filter((m) => m.kind === "photo");

  return (
    <>
      <HeroSection
        title={heroTitle}
        subtitle={heroSubtitle}
        heroMedia={heroMedia}
        members={members}
        mediaMap={mediaMap}
      />

      <AboutSection aboutText={aboutText} genres={genres} members={members} />

      {featuredVideos.length > 0 && (
        <FeaturedVideoSection items={featuredVideos} />
      )}

      <PerformanceVideoSection
        items={performanceVideos}
        members={members}
        mediaMap={mediaMap}
      />

      {(coverVideos.length > 0 || otherVideos.length > 0) && (
        <OtherVideoTabs
          coverItems={coverVideos}
          otherItems={otherVideos}
          members={members}
          mediaMap={mediaMap}
        />
      )}

      <PhotoGallery photos={photos} />

      <CareerTimeline careers={careers} />

      {/* <MemberCardGrid members={members} mediaMap={mediaMap} /> */}

      <CtaFooterSection
        contactEmail={contactEmail}
        members={members}
        mediaMap={mediaMap}
      />
    </>
  );
}
