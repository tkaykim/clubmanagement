import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SectionEditor } from "@/components/portfolio/admin/SectionEditor";
import { MediaManager } from "@/components/portfolio/admin/MediaManager";
import { CareerManager } from "@/components/portfolio/admin/CareerManager";
import { MemberPublicEditor } from "@/components/portfolio/admin/MemberPublicEditor";
import { PortfolioAdminTabs } from "@/components/portfolio/admin/PortfolioAdminTabs";
import type {
  PortfolioSectionKey,
  PortfolioMediaWithMembers,
  PortfolioCareerWithMedia,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManagePortfolioPage() {
  const supabase = createServerSupabaseClient();

  const sections: Record<PortfolioSectionKey, string> = {
    hero_title: "",
    hero_subtitle: "",
    about_team: "",
    genres: "",
    contact_email: "",
    contact_phone: "",
  };
  let media: PortfolioMediaWithMembers[] = [];
  let careers: PortfolioCareerWithMedia[] = [];
  let members: Array<{
    id: string;
    name: string;
    stage_name: string | null;
    position: string | null;
    profile_image_url: string | null;
    is_public: boolean;
    public_bio: string | null;
    specialties: string[] | null;
    is_active: boolean;
    joined_month: string | null;
  }> = [];

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
        .select(`id, title, category, event_date, location, description, link_url, media_id, sort_order, created_by, created_at, updated_at, media:portfolio_media(id, title, thumbnail_url, youtube_url)`)
        .order("event_date", { ascending: false }),
      supabase
        .from("crew_members")
        .select("id, name, stage_name, position, profile_image_url, is_public, public_bio, specialties, is_active, joined_month")
        .eq("is_active", true)
        .order("name"),
    ]);

    for (const s of sectionsRes.data ?? []) {
      sections[(s as { key: PortfolioSectionKey; value: string }).key] = (s as { key: PortfolioSectionKey; value: string }).value;
    }

    media = ((mediaRes.data ?? []) as unknown[]).map((item) => {
      const m = item as Record<string, unknown>;
      const rawMembers = (m.members as Array<{ crew_member: unknown }> | null) ?? [];
      return {
        ...m,
        members: rawMembers.map((pm) => pm.crew_member).filter(Boolean) as PortfolioMediaWithMembers["members"],
      } as PortfolioMediaWithMembers;
    });

    careers = (careersRes.data ?? []) as unknown as PortfolioCareerWithMedia[];
    members = (membersRes.data ?? []) as typeof members;
  } catch {
    // silently fail, use defaults
  }

  const mediaOptions = media.filter((m) => m.kind === "performance" || m.kind === "hero_video" || m.kind === "cover");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>포트폴리오 관리</h1>
          <div className="sub">공개 페이지 콘텐츠 편집</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="btn">
          포트폴리오 보기 →
        </a>
      </div>

      <PortfolioAdminTabs
        sectionEditor={
          <div className="card">
            <div className="card-head"><h3>소개 텍스트</h3></div>
            <div style={{ padding: 20 }}>
              <SectionEditor sections={sections} />
            </div>
          </div>
        }
        mediaManager={
          <div className="card flush">
            <MediaManager initialItems={media} members={members} />
          </div>
        }
        careerManager={
          <div className="card flush">
            <CareerManager initialCareers={careers} mediaOptions={mediaOptions} />
          </div>
        }
        memberEditor={
          <div className="card">
            <div className="card-head"><h3>멤버 공개 프로필</h3></div>
            <div style={{ padding: 20 }}>
              <MemberPublicEditor members={members} />
            </div>
          </div>
        }
      />
    </div>
  );
}
