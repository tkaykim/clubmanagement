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

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-os)",
        overflow: "hidden",
        background: "#fff",
        transition: "transform 150ms, box-shadow 150ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", background: "var(--muted)" }}>
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
          <div style={{ width: "100%", height: "100%", background: "var(--muted-2)" }} />
        )}
        <div
          onClick={() => onPlay(media.id)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.4)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0)"; }}
        >
          <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 150ms" }}
            className="play-icon"
          >
            <Play size={20} style={{ marginLeft: 3 }} />
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 6 }}>
          {media.title || "제목 없음"}
        </div>
        <div style={{ fontSize: 12, color: "var(--mf)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
          {media.event_date} {media.venue && `· ${media.venue}`}
        </div>
        {media.members && media.members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
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
              <span style={{ fontSize: 11, color: "var(--mf)" }}>+{media.members.length - 4}</span>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => onPlay(media.id)}>
            <Play size={12} />
            재생
          </button>
          <button className="btn sm ghost" style={{ flex: 1, fontSize: 11 }} onClick={() => onInquire(media.id)}>
            이 영상으로 문의
          </button>
        </div>
      </div>
    </div>
  );
}
