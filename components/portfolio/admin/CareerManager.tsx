"use client";

import { useState } from "react";
import { Plus, ChevronUp, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PortfolioCareerWithMedia, PortfolioCareerCategory, PortfolioMediaWithMembers } from "@/lib/types";

interface CareerManagerProps {
  initialCareers: PortfolioCareerWithMedia[];
  mediaOptions: PortfolioMediaWithMembers[];
}

const CATEGORY_OPTIONS: { value: PortfolioCareerCategory; label: string }[] = [
  { value: "performance", label: "공연" },
  { value: "broadcast", label: "방송" },
  { value: "commercial", label: "CF·광고" },
  { value: "competition", label: "대회" },
  { value: "workshop", label: "워크숍" },
];

const CATEGORY_STYLES: Record<PortfolioCareerCategory, { bg: string; fg: string }> = {
  performance: { bg: "var(--career-performance-bg)", fg: "var(--career-performance-fg)" },
  broadcast: { bg: "var(--career-broadcast-bg)", fg: "var(--career-broadcast-fg)" },
  commercial: { bg: "var(--career-commercial-bg)", fg: "var(--career-commercial-fg)" },
  competition: { bg: "var(--career-competition-bg)", fg: "var(--career-competition-fg)" },
  workshop: { bg: "var(--career-workshop-bg)", fg: "var(--career-workshop-fg)" },
};

export function CareerManager({ initialCareers, mediaOptions }: CareerManagerProps) {
  const [careers, setCareers] = useState<PortfolioCareerWithMedia[]>(initialCareers);
  const [filterCategory, setFilterCategory] = useState<PortfolioCareerCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Edit state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PortfolioCareerCategory | "">("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = filterCategory === "all" ? careers : careers.filter((c) => c.category === filterCategory);
  const selected = selectedId ? careers.find((c) => c.id === selectedId) || null : null;

  const loadItem = (c: PortfolioCareerWithMedia | null) => {
    setTitle(c?.title || "");
    setCategory((c?.category || "") as PortfolioCareerCategory | "");
    setEventDate(c?.event_date || "");
    setLocation(c?.location || "");
    setDescription(c?.description || "");
    setLinkUrl(c?.link_url || "");
    setMediaId(c?.media_id || "");
  };

  const handleSelect = (id: string) => {
    const c = careers.find((x) => x.id === id);
    setSelectedId(id);
    setIsNew(false);
    loadItem(c || null);
  };

  const handleNew = () => {
    setSelectedId(null);
    setIsNew(true);
    loadItem(null);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        category: category || null,
        event_date: eventDate || null,
        location: location.trim() || null,
        description: description.trim() || null,
        link_url: linkUrl.trim() || null,
        media_id: mediaId || null,
        sort_order: isNew ? careers.length : (selected?.sort_order || 0),
      };

      if (isNew) {
        const res = await fetch("/api/portfolio/careers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setCareers((prev) => [...prev, json.data as PortfolioCareerWithMedia]);
        setSelectedId(json.data.id);
        setIsNew(false);
      } else if (selectedId) {
        const res = await fetch(`/api/portfolio/careers/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setCareers((prev) => prev.map((c) => (c.id === selectedId ? (json.data as PortfolioCareerWithMedia) : c)));
      }
      toast.success("저장되었습니다");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("정말 삭제하시겠어요?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/portfolio/careers/${selectedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCareers((prev) => prev.filter((c) => c.id !== selectedId));
      setSelectedId(null);
      setIsNew(false);
      toast.success("삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const idx = filtered.findIndex((c) => c.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === filtered.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newFiltered = [...filtered];
    [newFiltered[idx], newFiltered[swapIdx]] = [newFiltered[swapIdx], newFiltered[idx]];

    const reordered = newFiltered.map((c, i) => ({ ...c, sort_order: i }));
    setCareers((prev) => {
      const others = prev.filter((c) => c.category !== filterCategory && filterCategory !== "all");
      return [...others, ...reordered];
    });

    try {
      await fetch("/api/portfolio/careers/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reordered.map((c) => ({ id: c.id, sort_order: c.sort_order })) }),
      });
    } catch {
      // Reorder API may not exist; ignore silently
    }
  };

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", minHeight: 400 }}>
      {/* Left */}
      <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div className="tabs" style={{ padding: "0 12px", margin: 0 }}>
          <button className={`tab ${filterCategory === "all" ? "on" : ""}`} onClick={() => setFilterCategory("all")}>전체</button>
          {CATEGORY_OPTIONS.map((o) => (
            <button key={o.value} className={`tab ${filterCategory === o.value ? "on" : ""}`} onClick={() => setFilterCategory(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div className="empty"><div>경력이 없습니다</div></div>
          ) : filtered.map((c, idx) => (
            <div
              key={c.id}
              onClick={() => handleSelect(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                background: selectedId === c.id ? "var(--muted)" : "transparent",
                borderLeft: selectedId === c.id ? "2px solid var(--fg)" : "2px solid transparent",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {c.category && CATEGORY_STYLES[c.category] && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: CATEGORY_STYLES[c.category].bg, color: CATEGORY_STYLES[c.category].fg, fontWeight: 600, marginBottom: 3, display: "inline-block" }}>
                    {CATEGORY_OPTIONS.find((o) => o.value === c.category)?.label}
                  </span>
                )}
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                <div style={{ fontSize: 10, color: "var(--mf)", fontFamily: "var(--font-mono)" }}>
                  {c.event_date} {c.location && `· ${c.location}`}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button type="button" className="btn icon-only sm ghost" style={{ padding: "2px 4px", height: 20 }} onClick={(e) => { e.stopPropagation(); moveItem(c.id, "up"); }} disabled={idx === 0}>
                  <ChevronUp size={12} />
                </button>
                <button type="button" className="btn icon-only sm ghost" style={{ padding: "2px 4px", height: 20 }} onClick={(e) => { e.stopPropagation(); moveItem(c.id, "down"); }} disabled={idx === filtered.length - 1}>
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
          <button className="btn ghost sm w-full" style={{ justifyContent: "center" }} onClick={handleNew}>
            <Plus size={13} />새 경력 추가
          </button>
        </div>
      </div>

      {/* Right */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {!selected && !isNew ? (
          <div className="empty" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div>항목을 선택하거나 새 항목을 추가하세요</div>
          </div>
        ) : (
          <>
            <div className="field">
              <label>제목 <span className="req">*</span></label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="○○ 뮤직페스티벌 오프닝" />
            </div>
            <div className="field">
              <label>카테고리</label>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value as PortfolioCareerCategory | "")}>
                <option value="">선택하세요</option>
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>날짜</label>
              <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="field">
              <label>장소</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="서울 올림픽공원" />
            </div>
            <div className="field">
              <label>설명</label>
              <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="field">
              <label>관련 링크 URL <span className="hint">선택</span></label>
              <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="field">
              <label>연관 미디어 <span className="hint">선택</span></label>
              <select className="select" value={mediaId} onChange={(e) => setMediaId(e.target.value)}>
                <option value="">없음</option>
                {mediaOptions.map((m) => <option key={m.id} value={m.id}>{m.title || m.id.slice(0, 8)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {selected && (
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
          </>
        )}
      </div>
    </div>
  );
}
