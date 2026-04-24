"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { PerformanceVideoCard } from "./PerformanceVideoCard";
import { VideoPlayerDialog } from "./VideoPlayerDialog";
import { InquiryDialog } from "./InquiryDialog";
import type { PortfolioMediaWithMembers, PublicCrewMember } from "@/lib/types";

interface PerformanceVideoSectionProps {
  items: PortfolioMediaWithMembers[];
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

export function PerformanceVideoSection({ items, members, mediaMap }: PerformanceVideoSectionProps) {
  const [playMedia, setPlayMedia] = useState<PortfolioMediaWithMembers | null>(null);
  const [inquiryMediaId, setInquiryMediaId] = useState<string | undefined>(undefined);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const handlePlay = (id: string) => {
    const media = mediaMap[id] || items.find((m) => m.id === id) || null;
    setPlayMedia(media);
  };

  const handleInquire = (id: string) => {
    setInquiryMediaId(id);
    setInquiryOpen(true);
  };

  return (
    <>
      <section id="performance" className="pf-section-band">
        <div className="pf-section">
          <div className="pf-section-head">
            <span className="pf-section-num">03 / PERFORMANCE</span>
            <h2 className="pf-section-title">공연 영상</h2>
            <span className="pf-section-kicker">{items.length > 0 ? `${items.length} works` : ""}</span>
          </div>

          {items.length === 0 ? (
            <div className="empty">
              <Video className="ico" strokeWidth={1.5} />
              <div>공연 영상이 없습니다</div>
            </div>
          ) : (
            <div className="pf-video-grid">
              {items.map((item) => (
                <PerformanceVideoCard
                  key={item.id}
                  media={item}
                  onPlay={handlePlay}
                  onInquire={handleInquire}
                />
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

      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        defaultTargetType="team"
        defaultReferenceMediaId={inquiryMediaId}
        members={members}
        referenceMediaMap={mediaMap}
      />
    </>
  );
}
