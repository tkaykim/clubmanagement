import { Film } from "lucide-react";
import { extractYouTubeId, youtubeEmbed } from "@/lib/youtube";
import type { PortfolioMediaWithMembers } from "@/lib/types";

interface FeaturedVideoSectionProps {
  items: PortfolioMediaWithMembers[];
}

export function FeaturedVideoSection({ items }: FeaturedVideoSectionProps) {
  return (
    <section id="featured-video" style={{ background: "var(--muted)" }}>
      <div className="pf-section">
        <h2 className="pf-section-title">대표 영상</h2>

        {items.length === 0 ? (
          <div className="empty">
            <Film className="ico" strokeWidth={1.5} />
            <div>대표 영상이 준비 중입니다</div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: items.length === 1 ? "1fr" : "repeat(2, 1fr)",
              gap: 24,
              maxWidth: items.length === 1 ? 900 : "none",
              margin: "0 auto",
            }}
          >
            {items.map((item) => {
              const videoId = item.youtube_url ? extractYouTubeId(item.youtube_url) : null;
              if (!videoId) return null;
              return (
                <div key={item.id}>
                  {item.title && (
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>{item.title}</div>
                  )}
                  <iframe
                    src={youtubeEmbed(videoId)}
                    title={`${item.title || "대표 영상"} — YouTube 영상`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      borderRadius: "var(--radius-os-lg)",
                      border: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
