"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ImageIcon, ImageOff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { PortfolioMediaWithMembers } from "@/lib/types";

interface PhotoGalleryProps {
  photos: PortfolioMediaWithMembers[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handlePrev = useCallback(() => {
    setLightboxIndex((idx) => idx === null ? null : (idx - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setLightboxIndex((idx) => idx === null ? null : (idx + 1) % photos.length);
  }, [photos.length]);

  // Global keydown listener for lightbox — DialogContent focus trap may swallow events
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, handlePrev, handleNext]);

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <>
      <section id="gallery" style={{ background: "var(--bg)" }}>
        <div className="pf-section">
          <h2 className="pf-section-title">포토 갤러리</h2>

          {photos.length === 0 ? (
            <div className="empty">
              <ImageIcon className="ico" strokeWidth={1.5} />
              <div>사진이 없습니다</div>
            </div>
          ) : (
            <div
              style={{
                columns: "4 200px",
                columnGap: 12,
              }}
            >
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  style={{
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "zoom-in",
                    breakInside: "avoid",
                  }}
                  onClick={() => setLightboxIndex(i)}
                >
                  {photo.image_url ? (
                    <Image
                      src={photo.image_url}
                      alt={photo.title || `갤러리 사진 ${i + 1}`}
                      width={400}
                      height={300}
                      style={{ width: "100%", height: "auto", display: "block", transition: "transform 150ms" }}
                      loading="lazy"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.03)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = ""; }}
                    />
                  ) : (
                    <div style={{ aspectRatio: "1", background: "var(--muted-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageOff size={24} style={{ color: "var(--mf-2)" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={lightboxIndex !== null} onOpenChange={(o) => { if (!o) setLightboxIndex(null); }}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden"
          style={{ background: "rgba(0,0,0,0.92)", border: 0 }}
          aria-label="갤러리"
        >
          <button
            onClick={() => setLightboxIndex(null)}
            aria-label="갤러리 닫기"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              background: "rgba(255,255,255,0.15)",
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

          {currentPhoto && (
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
              {currentPhoto.image_url ? (
                <Image
                  src={currentPhoto.image_url}
                  alt={`갤러리 사진 ${(lightboxIndex ?? 0) + 1}/${photos.length}`}
                  width={1200}
                  height={800}
                  style={{ maxWidth: "85vw", maxHeight: "80vh", objectFit: "contain", display: "block" }}
                />
              ) : (
                <div style={{ width: 400, height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>
                  <ImageOff size={48} />
                </div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    aria-label="이전 사진"
                    disabled={lightboxIndex === 0}
                    style={{
                      position: "absolute",
                      left: 12,
                      background: "rgba(255,255,255,0.15)",
                      border: "none",
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#fff",
                      opacity: lightboxIndex === 0 ? 0.3 : 1,
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="다음 사진"
                    disabled={lightboxIndex === photos.length - 1}
                    style={{
                      position: "absolute",
                      right: 12,
                      background: "rgba(255,255,255,0.15)",
                      border: "none",
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#fff",
                      opacity: lightboxIndex === photos.length - 1 ? 0.3 : 1,
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {(lightboxIndex ?? 0) + 1}/{photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
