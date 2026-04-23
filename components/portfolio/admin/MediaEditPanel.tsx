"use client";

import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { Loader2, Trash2 } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import type { PortfolioMediaWithMembers, PortfolioMediaKind, PublicCrewMember } from "@/lib/types";
import type { PortfolioMediaInput } from "@/lib/validators";

interface MediaEditPanelProps {
  item: PortfolioMediaWithMembers | null;
  kind: PortfolioMediaKind;
  members: PublicCrewMember[];
  onSave: (data: PortfolioMediaInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const IS_VIDEO_KIND = (k: PortfolioMediaKind) =>
  ["hero_video", "performance", "cover", "other_video"].includes(k);
const IS_IMAGE_KIND = (k: PortfolioMediaKind) =>
  ["hero_image", "photo"].includes(k);

export function MediaEditPanel({ item, kind, members, onSave, onDelete }: MediaEditPanelProps) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [youtubeUrl, setYoutubeUrl] = useState(item?.youtube_url || "");
  const [imageUrl, setImageUrl] = useState(item?.image_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(item?.thumbnail_url || "");
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false);
  const [eventDate, setEventDate] = useState(item?.event_date || "");
  const [venue, setVenue] = useState(item?.venue || "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    item?.members?.map((m) => m.id) || []
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdown, setMemberDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(item?.title || "");
    setDescription(item?.description || "");
    setYoutubeUrl(item?.youtube_url || "");
    setImageUrl(item?.image_url || "");
    setThumbnailUrl(item?.thumbnail_url || "");
    setIsFeatured(item?.is_featured || false);
    setEventDate(item?.event_date || "");
    setVenue(item?.venue || "");
    setSelectedMemberIds(item?.members?.map((m) => m.id) || []);
  }, [item]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-fill thumbnail from YouTube URL
  const handleYoutubeBlur = () => {
    if (youtubeUrl && !thumbnailUrl) {
      const id = extractYouTubeId(youtubeUrl);
      if (id) setThumbnailUrl(youtubeThumbnail(id, "hq"));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        kind,
        title: title || null,
        description: description || null,
        image_url: imageUrl || null,
        youtube_url: youtubeUrl || null,
        thumbnail_url: thumbnailUrl || null,
        is_featured: isFeatured,
        event_date: eventDate || null,
        venue: venue || null,
        sort_order: item?.sort_order || 0,
        member_ids: selectedMemberIds,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm("정말 삭제하시겠어요?")) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (m.stage_name || "").toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 0, height: "100%", overflowY: "auto" }}>
      <div style={{ fontSize: 12, color: "var(--mf)", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 16 }}>
        {item ? "항목 편집" : "새 항목"}
      </div>

      <div className="field">
        <label>제목</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="영상/이미지 제목" />
      </div>

      <div className="field">
        <label>설명</label>
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)" />
      </div>

      {IS_VIDEO_KIND(kind) && (
        <div className="field">
          <label>YouTube URL</label>
          <input
            className="input"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onBlur={handleYoutubeBlur}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {youtubeUrl && extractYouTubeId(youtubeUrl) && (
            <div style={{ fontSize: 11, color: "var(--ok)", marginTop: 4 }}>유효한 YouTube URL입니다</div>
          )}
          {youtubeUrl && !extractYouTubeId(youtubeUrl) && (
            <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>유효하지 않은 YouTube URL입니다</div>
          )}
        </div>
      )}

      {IS_IMAGE_KIND(kind) && (
        <div className="field">
          <label>이미지 업로드</label>
          <ImageUploader
            value={imageUrl}
            kind={kind === "photo" ? "photos" : "hero"}
            onChange={setImageUrl}
            onClear={() => setImageUrl("")}
          />
        </div>
      )}

      {IS_VIDEO_KIND(kind) && (
        <div className="field">
          <label>썸네일</label>
          {thumbnailUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <NextImage src={thumbnailUrl} alt="썸네일" width={80} height={45} style={{ objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} unoptimized={thumbnailUrl.startsWith("blob:")} />
              <button type="button" className="btn sm ghost" onClick={() => setThumbnailUrl("")} style={{ color: "var(--mf)" }}>제거</button>
            </div>
          ) : (
            <ImageUploader
              kind="thumbnails"
              onChange={setThumbnailUrl}
            />
          )}
        </div>
      )}

      {kind === "performance" && (
        <>
          <div className="field">
            <label>공연 날짜</label>
            <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="field">
            <label>장소</label>
            <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="공연장 이름" />
          </div>
        </>
      )}

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          대표 여부
          <button
            type="button"
            className={`switch ${isFeatured ? "on" : ""}`}
            onClick={() => setIsFeatured((v) => !v)}
            role="switch"
            aria-checked={isFeatured}
          />
        </label>
      </div>

      {IS_VIDEO_KIND(kind) && (
        <div className="field" ref={dropdownRef} style={{ position: "relative" }}>
          <label>참여 멤버</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {selectedMemberIds.map((id) => {
              const m = members.find((x) => x.id === id);
              if (!m) return null;
              return (
                <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", border: "1px solid var(--border)", borderRadius: 999, fontSize: 12 }}>
                  {m.stage_name || m.name}
                  <button type="button" onClick={() => toggleMember(id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1, color: "var(--mf)" }}>×</button>
                </span>
              );
            })}
          </div>
          <div
            className="input"
            style={{ display: "flex", alignItems: "center", cursor: "pointer", height: 38 }}
            onClick={() => setMemberDropdown((o) => !o)}
          >
            <input
              placeholder="멤버 추가..."
              value={memberSearch}
              onChange={(e) => { setMemberSearch(e.target.value); setMemberDropdown(true); }}
              onClick={(e) => e.stopPropagation()}
              style={{ border: "none", outline: "none", flex: 1, fontSize: 13, background: "transparent" }}
            />
          </div>
          {memberDropdown && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: selectedMemberIds.includes(m.id) ? "var(--muted)" : "transparent" }}
                  onClick={() => toggleMember(m.id)}
                  onMouseEnter={(e) => { if (!selectedMemberIds.includes(m.id)) (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
                  onMouseLeave={(e) => { if (!selectedMemberIds.includes(m.id)) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <span style={{ width: 16, height: 16, border: `1.5px solid ${selectedMemberIds.includes(m.id) ? "var(--fg)" : "var(--border-2)"}`, borderRadius: 4, background: selectedMemberIds.includes(m.id) ? "var(--fg)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedMemberIds.includes(m.id) && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                  </span>
                  <span style={{ fontWeight: 600 }}>{m.stage_name || m.name}</span>
                  {m.position && <span style={{ fontSize: 11, color: "var(--mf)" }}>{m.position}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        {item && (
          <button className="btn ghost" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            삭제
          </button>
        )}
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
