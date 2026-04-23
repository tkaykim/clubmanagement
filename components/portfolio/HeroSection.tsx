"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { InquiryDialog } from "./InquiryDialog";
import { VideoPlayerDialog } from "./VideoPlayerDialog";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import type { PortfolioMediaWithMembers, PublicCrewMember } from "@/lib/types";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  heroMedia?: PortfolioMediaWithMembers | null;
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--pf-hero-fg)", letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

export function HeroSection({ title, subtitle, heroMedia, members, mediaMap }: HeroSectionProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const hasMedia = !!heroMedia;
  const isVideo = heroMedia?.kind === "hero_video";
  const isImage = heroMedia?.kind === "hero_image";

  const videoId = isVideo && heroMedia?.youtube_url
    ? extractYouTubeId(heroMedia.youtube_url)
    : null;

  const thumbnailUrl = videoId
    ? (heroMedia?.thumbnail_url || youtubeThumbnail(videoId, "hq"))
    : heroMedia?.image_url || null;

  return (
    <>
      <section className="pf-hero-section" id="hero">
        <div
          style={{
            width: "100%",
            maxWidth: "var(--pf-max-w)",
            margin: "0 auto",
            padding: "120px 32px 80px",
            display: "grid",
            gridTemplateColumns: hasMedia ? "1fr 0.7fr" : "1fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div style={{ maxWidth: "var(--pf-max-w-narrow)" }}>
            <div className="pf-eyebrow" style={{ marginBottom: 20 }}>ONESHOT CREW</div>
            <h1 className="pf-hero-title" style={{ marginBottom: subtitle ? 20 : 32 }}>
              {title || "원샷크루"}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 16, color: "var(--pf-hero-muted)", lineHeight: 1.7, marginBottom: 32 }}>
                {subtitle}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn primary lg"
                onClick={() => setInquiryOpen(true)}
                aria-haspopup="dialog"
                style={{ fontSize: 15, padding: "12px 24px" }}
              >
                섭외 문의하기
              </button>
              <a
                href="#performance"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 15,
                  padding: "12px 24px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.8)",
                  textDecoration: "none",
                }}
              >
                공연 영상 보기 ↓
              </a>
            </div>

            <div
              style={{
                marginTop: 40,
                paddingTop: 24,
                borderTop: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                gap: 40,
                flexWrap: "wrap",
              }}
            >
              <HeroStat label="TOTAL MEMBERS" value="50+" />
              <HeroStat label="ACTIVE" value={`${members.length || 16}`} />
              <HeroStat label="GENRES" value="5" />
            </div>
          </div>

          {hasMedia && (
            <div style={{ position: "relative", borderRadius: "var(--radius-os-lg)", overflow: "hidden" }}>
              {isVideo && videoId ? (
                <div style={{ position: "relative", aspectRatio: "16/9" }}>
                  {thumbnailUrl && (
                    <Image
                      src={thumbnailUrl}
                      alt="대표 영상 썸네일"
                      fill
                      style={{ objectFit: "cover" }}
                      priority
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={() => setVideoOpen(true)}
                      aria-label="대표 영상 재생"
                      style={{
                        background: "rgba(255,255,255,0.9)",
                        border: "none",
                        borderRadius: "50%",
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Play size={28} style={{ marginLeft: 4 }} />
                    </button>
                  </div>
                </div>
              ) : isImage && thumbnailUrl ? (
                <div style={{ position: "relative", aspectRatio: "16/9" }}>
                  <Image
                    src={thumbnailUrl}
                    alt={`${title} 팀 사진`}
                    fill
                    style={{ objectFit: "cover" }}
                    priority
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        defaultTargetType="team"
        members={members}
        referenceMediaMap={mediaMap}
      />

      {heroMedia && (
        <VideoPlayerDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          media={heroMedia}
          members={members}
          mediaMap={mediaMap}
        />
      )}
    </>
  );
}
