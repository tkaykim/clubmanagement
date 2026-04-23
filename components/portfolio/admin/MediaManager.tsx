"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Plus, ChevronUp, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { MediaEditPanel } from "./MediaEditPanel";
import { extractYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import type { PortfolioMediaWithMembers, PortfolioMediaKind, PublicCrewMember } from "@/lib/types";
import type { PortfolioMediaInput } from "@/lib/validators";

interface MediaManagerProps {
  initialItems: PortfolioMediaWithMembers[];
  members: PublicCrewMember[];
}

const KIND_TABS: { value: PortfolioMediaKind; label: string }[] = [
  { value: "hero_video", label: "대표" },
  { value: "performance", label: "공연" },
  { value: "cover", label: "커버" },
  { value: "photo", label: "사진" },
  { value: "other_video", label: "기타" },
];

export function MediaManager({ initialItems, members }: MediaManagerProps) {
  const [items, setItems] = useState<PortfolioMediaWithMembers[]>(initialItems);
  const [activeKind, setActiveKind] = useState<PortfolioMediaKind>("performance");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const kindItems = items.filter((i) => i.kind === activeKind);
  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) || null : null;

  const handleSave = async (data: PortfolioMediaInput) => {
    try {
      if (isNew) {
        const res = await fetch("/api/portfolio/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "저장 실패");
        const newItem = json.data as PortfolioMediaWithMembers;
        setItems((prev) => [...prev, newItem]);
        setSelectedId(newItem.id);
        setIsNew(false);
        toast.success("저장되었습니다");
      } else if (selectedId) {
        const res = await fetch(`/api/portfolio/media/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "저장 실패");
        const updated = json.data as PortfolioMediaWithMembers;
        setItems((prev) => prev.map((i) => (i.id === selectedId ? updated : i)));
        toast.success("저장되었습니다");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/portfolio/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedId(null);
      toast.success("삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const idx = kindItems.findIndex((i) => i.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === kindItems.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newKindItems = [...kindItems];
    [newKindItems[idx], newKindItems[swapIdx]] = [newKindItems[swapIdx], newKindItems[idx]];

    const reorderPayload = newKindItems.map((item, i) => ({ id: item.id, sort_order: i }));

    // Optimistic update
    setItems((prev) => {
      const nonKind = prev.filter((i) => i.kind !== activeKind);
      const reordered = newKindItems.map((item, i) => ({ ...item, sort_order: i }));
      return [...nonKind, ...reordered];
    });

    try {
      const res = await fetch("/api/portfolio/media/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderPayload }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("순서 변경에 실패했습니다");
      setItems(initialItems); // rollback
    }
  };

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", minHeight: 400 }}>
      {/* Left: List */}
      <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        {/* Kind tabs */}
        <div className="tabs" style={{ padding: "0 12px", margin: 0 }}>
          {KIND_TABS.map((t) => (
            <button
              key={t.value}
              className={`tab ${activeKind === t.value ? "on" : ""}`}
              onClick={() => { setActiveKind(t.value); setSelectedId(null); setIsNew(false); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {kindItems.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 13, color: "var(--mf)" }}>이 종류의 미디어가 없습니다</div>
            </div>
          ) : (
            kindItems.map((item, idx) => {
              const videoId = item.youtube_url ? extractYouTubeId(item.youtube_url) : null;
              const thumb = item.thumbnail_url || (videoId ? youtubeThumbnail(videoId, "mq") : item.image_url);
              return (
                <div
                  key={item.id}
                  onClick={() => { setSelectedId(item.id); setIsNew(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    background: selectedId === item.id ? "var(--muted)" : "transparent",
                    borderLeft: selectedId === item.id ? "2px solid var(--fg)" : "2px solid transparent",
                  }}
                >
                  {thumb ? (
                    <NextImage src={thumb} alt="" width={40} height={28} style={{ objectFit: "cover", borderRadius: 4, flexShrink: 0 }} unoptimized={thumb.startsWith("blob:")} />
                  ) : (
                    <div style={{ width: 40, height: 28, background: "var(--muted-2)", borderRadius: 4, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title || "제목 없음"}
                    </div>
                    {item.event_date && (
                      <div style={{ fontSize: 10, color: "var(--mf)", fontFamily: "var(--font-mono)" }}>{item.event_date}</div>
                    )}
                  </div>
                  {item.is_featured && <Star size={12} style={{ color: "var(--warn)", flexShrink: 0 }} />}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button type="button" className="btn icon-only sm ghost" style={{ padding: "2px 4px", height: 20 }}
                      onClick={(e) => { e.stopPropagation(); moveItem(item.id, "up"); }}
                      disabled={idx === 0}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button type="button" className="btn icon-only sm ghost" style={{ padding: "2px 4px", height: 20 }}
                      onClick={(e) => { e.stopPropagation(); moveItem(item.id, "down"); }}
                      disabled={idx === kindItems.length - 1}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
          <button
            className="btn ghost sm w-full"
            style={{ justifyContent: "center" }}
            onClick={() => { setSelectedId(null); setIsNew(true); }}
          >
            <Plus size={13} />
            새 항목 추가
          </button>
        </div>
      </div>

      {/* Right: Edit panel */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {!selectedItem && !isNew ? (
          <div className="empty" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div>항목을 선택하거나 새 항목을 추가하세요</div>
          </div>
        ) : (
          <MediaEditPanel
            item={isNew ? null : selectedItem}
            kind={activeKind}
            members={members}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => { setSelectedId(null); setIsNew(false); }}
          />
        )}
      </div>
    </div>
  );
}
