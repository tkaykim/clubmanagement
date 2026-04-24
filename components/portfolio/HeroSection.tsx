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
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.5)",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "var(--pf-hero-fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function HeroSection({ title, subtitle, heroMedia, members, mediaMap }: HeroSectionProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const hasMedia = !!heroMedia;
  const videoId = heroMedia?.youtube_url
    ? extractYouTubeId(heroMedia.youtube_url)
    : null;
  const thumbnailUrl = heroMedia?.thumbnail_url
    || (videoId ? youtubeThumbnail(videoId, "hq") : null)
    || heroMedia?.image_url
    || null;

  return (
    <>
      <section className="pf-hero-section" id="hero">
        <span className="pf-hero-vlabel" aria-hidden="true">ONE KILL · SINCE 2023</span>
        <div
          className="pf-hero-inner"
          style={{
            width: "100%",
            maxWidth: "var(--pf-max-w)",
            margin: "0 auto",
            padding: "96px 24px 64px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className="pf-eyebrow">ONESHOT DANCE CREW — KOREA</div>

          <h1 className="pf-hero-title">
            {(title || "원샷크루").toUpperCase()}
          </h1>

          {subtitle && (
            <p className="pf-hero-sub">
              {subtitle}
            </p>
          )}

          <div className="pf-hero-rule" aria-hidden="true" />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: hasMedia ? "minmax(0, 1.2fr) minmax(0, 1fr)" : "1fr",
              gap: 40,
              alignItems: "flex-start",
            }}
            className="pf-hero-grid"
          >
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "var(--pf-hero-muted)",
                  margin: "0 0 28px",
                  maxWidth: 520,
                }}
              >
                K-POP · 한국무용 · 현대무용 · 댄스스포츠 · 힙합 · 브레이킹 — 6개 장르를
                한 팀에서. 전공자 기반 창작 안무와 고퀄리티 퍼포먼스로
                <br />
                <strong style={{ color: "var(--pf-hero-fg)", fontWeight: 700 }}>
                  한 번의 무대(ONE KILL)
                </strong>
                를 완성합니다.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn primary lg"
                  onClick={() => setInquiryOpen(true)}
                  aria-haspopup="dialog"
                  style={{ fontSize: 14, padding: "12px 22px" }}
                >
                  섭외 문의하기 →
                </button>
                <a
                  href="#performance"
                  className="btn lg pf-ghost"
                  style={{
                    fontSize: 14,
                    padding: "12px 22px",
                    textDecoration: "none",
                  }}
                >
                  공연 영상 보기
                </a>
              </div>

              <div
                style={{
                  marginTop: 36,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(255,255,255,0.14)",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 20,
                }}
              >
                <HeroStat label="Members" value="50+" />
                <HeroStat label="Active" value={`${members.length || 16}`} />
                <HeroStat label="Genres" value="6" />
              </div>
            </div>

            {hasMedia && thumbnailUrl && (
              <div
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-os-lg)",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ position: "relative", aspectRatio: "16/10" }}>
                  <Image
                    src={thumbnailUrl}
                    alt={heroMedia?.title || `${title} 대표 영상 썸네일`}
                    fill
                    style={{ objectFit: "cover" }}
                    priority
                    sizes="(max-width: 900px) 100vw, 50vw"
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {videoId && (
                      <button
                        onClick={() => setVideoOpen(true)}
                        aria-label="대표 영상 재생"
                        style={{
                          background: "rgba(255,255,255,0.96)",
                          border: "none",
                          borderRadius: "50%",
                          width: 64,
                          height: 64,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#0B0B0D",
                          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                        }}
                      >
                        <Play size={26} style={{ marginLeft: 3 }} />
                      </button>
                    )}
                  </div>
                  {heroMedia?.title && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0, right: 0, bottom: 0,
                        padding: "14px 16px",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.9)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={{
                        background: "rgba(255,255,255,0.15)",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}>
                        Featured
                      </span>
                      <span style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                        flex: 1,
                      }}>
                        {heroMedia.title}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
