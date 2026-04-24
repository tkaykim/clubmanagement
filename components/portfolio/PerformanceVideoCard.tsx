"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import type { PortfolioMediaWithMembers } from "@/lib/types";

interface PerformanceVideoCardProps {
  media: PortfolioMediaWithMembers;
  onPlay: (mediaId: string) => void;
  onInquire: (mediaId: string) => void;
}

export function PerformanceVideoCard({ media, onPlay, onInquire }: PerformanceVideoCardProps) {
  const videoId = media.youtube_url ? extractYouTubeId(media.youtube_url) : null;
  const thumbnail = media.thumbnail_url || (videoId ? youtubeThumbnail(videoId, "hq") : null);
  const hasMeta = media.event_date || media.venue || media.description;

  return (
    <div className="pf-video-card">
      <div className="pf-video-thumb">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={media.title || "공연 영상"}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#000" }} />
        )}
        <div
          className="pf-video-thumb-overlay"
          onClick={() => onPlay(media.id)}
          role="button"
          aria-label={`${media.title || "영상"} 재생`}
        >
          <div className="pf-video-play-icon">
            <Play size={22} style={{ marginLeft: 3 }} />
          </div>
        </div>
        {media.is_featured && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "3px 7px",
              background: "rgba(255,255,255,0.95)",
              color: "#0B0B0D",
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            Featured
          </span>
        )}
      </div>
      <div className="pf-video-body">
        <div className="pf-video-title">
          {media.title || "제목 없음"}
        </div>
        {hasMeta && (
          <div className="pf-video-meta">
            {media.event_date && <span>{media.event_date.replace(/-/g, ".")}</span>}
            {media.event_date && media.venue && <span>·</span>}
            {media.venue && <span>{media.venue}</span>}
            {!media.event_date && !media.venue && media.description && (
              <span>{media.description}</span>
            )}
          </div>
        )}
        {media.members && media.members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <div className="av-stack">
              {media.members.slice(0, 4).map((m) => (
                <div key={m.id} className="av sm" title={m.stage_name || m.name}>
                  {m.profile_image_url ? (
                    <Image src={m.profile_image_url} alt={m.stage_name || m.name} width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    (m.stage_name || m.name).charAt(0)
                  )}
                </div>
              ))}
            </div>
            {media.members.length > 4 && (
              <span style={{ fontSize: 11, color: "var(--pf-mf)" }}>+{media.members.length - 4}</span>
            )}
          </div>
        )}
      </div>
      <div className="pf-video-footer">
        <button className="btn sm primary" onClick={() => onPlay(media.id)}>
          <Play size={12} />
          재생
        </button>
        <button className="btn sm" onClick={() => onInquire(media.id)}>
          이 영상으로 문의
        </button>
      </div>
    </div>
  );
}
