"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Music } from "lucide-react";
import { VideoPlayerDialog } from "./VideoPlayerDialog";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import type { PortfolioMediaWithMembers, PublicCrewMember } from "@/lib/types";

interface OtherVideoTabsProps {
  coverItems: PortfolioMediaWithMembers[];
  otherItems: PortfolioMediaWithMembers[];
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

function VideoMiniCard({ media, onPlay }: { media: PortfolioMediaWithMembers; onPlay: (m: PortfolioMediaWithMembers) => void }) {
  const videoId = media.youtube_url ? extractYouTubeId(media.youtube_url) : null;
  const thumbnail = media.thumbnail_url || (videoId ? youtubeThumbnail(videoId, "hq") : null);

  return (
    <button
      type="button"
      onClick={() => onPlay(media)}
      style={{
        cursor: "pointer",
        background: "transparent",
        border: 0,
        padding: 0,
        textAlign: "left",
        color: "inherit",
        font: "inherit",
        display: "block",
        width: "100%",
      }}
      aria-label={`${media.title || "영상"} 재생`}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          borderRadius: 10,
          overflow: "hidden",
          background: "#000",
          marginBottom: 8,
          border: "1px solid var(--pf-border)",
        }}
      >
        {thumbnail ? (
          <Image src={thumbnail} alt={media.title || "영상"} fill style={{ objectFit: "cover" }} loading="lazy" sizes="(max-width:640px) 50vw, (max-width:900px) 33vw, 25vw" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#000" }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={28} style={{ color: "#fff", opacity: 0.85, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))" }} />
        </div>
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 12.5,
          color: "var(--pf-ink)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.4,
          wordBreak: "keep-all",
        }}
      >
        {media.title || "제목 없음"}
      </div>
    </button>
  );
}

export function OtherVideoTabs({ coverItems, otherItems, members, mediaMap }: OtherVideoTabsProps) {
  const [activeTab, setActiveTab] = useState<"cover" | "other">("cover");
  const [playMedia, setPlayMedia] = useState<PortfolioMediaWithMembers | null>(null);

  const activeItems = activeTab === "cover" ? coverItems : otherItems;

  return (
    <>
      <section id="cover-video" className="pf-section-band alt">
        <div className="pf-section">
          <div className="pf-section-head">
            <span className="pf-section-num">04 / COVER & OTHER</span>
            <h2 className="pf-section-title">영상</h2>
            <span className="pf-section-kicker">{coverItems.length + otherItems.length} clips</span>
          </div>

          <div className="tabs" style={{ marginBottom: 20 }}>
            <button
              className={`tab ${activeTab === "cover" ? "on" : ""}`}
              onClick={() => setActiveTab("cover")}
            >
              커버 영상
              <span className="count">{coverItems.length}</span>
            </button>
            <button
              className={`tab ${activeTab === "other" ? "on" : ""}`}
              onClick={() => setActiveTab("other")}
            >
              기타 영상
              <span className="count">{otherItems.length}</span>
            </button>
          </div>

          {activeItems.length === 0 ? (
            <div className="empty">
              <Music className="ico" strokeWidth={1.5} />
              <div>영상이 없습니다</div>
            </div>
          ) : (
            <div className="pf-video-grid">
              {activeItems.map((item) => (
                <VideoMiniCard key={item.id} media={item} onPlay={setPlayMedia} />
              ))}
            </div>
          )}
        </div>
      </section>

      <VideoPlayerDialog
        open={!!playMedia}
        onOpenChange={(o) => { if (!o) setPlayMedia(null); }}
        media={playMedia}
        members={members}
        mediaMap={mediaMap}
      />
    </>
  );
}
