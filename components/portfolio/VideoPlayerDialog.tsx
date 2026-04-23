"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InquiryDialog } from "./InquiryDialog";
import { extractYouTubeId, youtubeEmbed } from "@/lib/youtube";
import type { PortfolioMediaWithMembers, PublicCrewMember } from "@/lib/types";

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: PortfolioMediaWithMembers | null;
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

export function VideoPlayerDialog({ open, onOpenChange, media, members, mediaMap }: VideoPlayerDialogProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);

  if (!media) return null;

  const videoId = media.youtube_url ? extractYouTubeId(media.youtube_url) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[900px] p-0 overflow-hidden"
          style={{ background: "#000", border: 0 }}
          aria-label="영상 재생"
        >
          <button
            onClick={() => onOpenChange(false)}
            aria-label="영상 닫기"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              background: "rgba(0,0,0,0.6)",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={18} />
          </button>

          {videoId ? (
            <div>
              <iframe
                src={`${youtubeEmbed(videoId)}?autoplay=1`}
                title={`${media.title || "영상"} — YouTube 영상`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  border: 0,
                  display: "block",
                }}
              />
              <div style={{ padding: "16px 20px", background: "#111", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  {media.title && (
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 4 }}>{media.title}</div>
                  )}
                  {(media.event_date || media.venue) && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)" }}>
                      {media.event_date} {media.venue && `· ${media.venue}`}
                    </div>
                  )}
                </div>
                <button
                  className="btn sm"
                  onClick={() => { onOpenChange(false); setInquiryOpen(true); }}
                  style={{ flexShrink: 0, background: "#fff", color: "#000" }}
                >
                  이 레퍼런스로 문의하기
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
              영상을 재생할 수 없습니다
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        defaultTargetType="team"
        defaultReferenceMediaId={media.id}
        members={members}
        referenceMediaMap={mediaMap}
      />
    </>
  );
}
