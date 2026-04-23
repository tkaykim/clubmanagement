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
    <div
      style={{ cursor: "pointer" }}
      onClick={() => onPlay(media)}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", background: "var(--muted-2)", marginBottom: 8 }}>
        {thumbnail ? (
          <Image src={thumbnail} alt={media.title || "영상"} fill style={{ objectFit: "cover" }} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--muted-2)" }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.4)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0)"; }}
        >
          <Play size={32} style={{ color: "#fff", opacity: 0.8 }} />
        </div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {media.title || "제목 없음"}
      </div>
    </div>
  );
}

export function OtherVideoTabs({ coverItems, otherItems, members, mediaMap }: OtherVideoTabsProps) {
  const [activeTab, setActiveTab] = useState<"cover" | "other">("cover");
  const [playMedia, setPlayMedia] = useState<PortfolioMediaWithMembers | null>(null);

  const activeItems = activeTab === "cover" ? coverItems : otherItems;

  return (
    <>
      <section id="cover-video" style={{ background: "var(--muted)" }}>
        <div className="pf-section">
          <h2 className="pf-section-title">영상</h2>

          <div className="tabs" style={{ marginBottom: 24 }}>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
              }}
            >
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
