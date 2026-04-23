"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ImageUploader } from "./ImageUploader";

// CrewMember with public fields (from manage page server fetch)
interface CrewMemberWithPublicFields {
  id: string;
  name: string;
  stage_name: string | null;
  position: string | null;
  profile_image_url: string | null;
  is_public: boolean;
  public_bio: string | null;
  specialties: string[] | null;
  is_active: boolean;
}

interface MemberPublicEditorProps {
  members: CrewMemberWithPublicFields[];
}

const SPECIALTY_OPTIONS = [
  "K-pop",
  "한국무용",
  "현대무용",
  "댄스스포츠",
  "창작안무",
];

export function MemberPublicEditor({ members: initialMembers }: MemberPublicEditorProps) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [editMember, setEditMember] = useState<CrewMemberWithPublicFields | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sheet edit state
  const [isPublic, setIsPublic] = useState(false);
  const [publicBio, setPublicBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.stage_name || "").toLowerCase().includes(q);
  });

  const openEdit = (m: CrewMemberWithPublicFields) => {
    setEditMember(m);
    setIsPublic(m.is_public);
    setPublicBio(m.public_bio || "");
    setSpecialties(m.specialties || []);
    setProfileImageUrl(m.profile_image_url || "");
    setSheetOpen(true);
  };

  const handleTogglePublic = async (m: CrewMemberWithPublicFields) => {
    const newVal = !m.is_public;
    setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, is_public: newVal } : x));
    try {
      const res = await fetch(`/api/members/${m.id}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: newVal }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, is_public: m.is_public } : x));
      toast.error("변경에 실패했습니다");
    }
  };

  const handleSave = async () => {
    if (!editMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${editMember.id}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_public: isPublic,
          public_bio: publicBio.trim() || null,
          specialties: specialties.length > 0 ? specialties : null,
          profile_image_url: profileImageUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      setMembers((prev) => prev.map((x) => x.id === editMember.id ? {
        ...x, is_public: isPublic, public_bio: publicBio || null,
        specialties: specialties.length > 0 ? specialties : null,
        profile_image_url: profileImageUrl || null,
      } : x));
      setSheetOpen(false);
      toast.success("저장되었습니다");
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <input className="input" placeholder="멤버 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-os)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mf)", fontWeight: 500 }}>멤버</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mf)", fontWeight: 500 }}>공개</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mf)", fontWeight: 500 }}>소개</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mf)", fontWeight: 500 }}>특기</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11.5, fontWeight: 500 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="av sm" style={{ flexShrink: 0 }}>
                      {m.profile_image_url ? (
                        <NextImage src={m.profile_image_url} alt="" width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        (m.stage_name || m.name).charAt(0)
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                      {m.stage_name && <div style={{ fontSize: 11, color: "var(--mf)" }}>{m.stage_name}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <button
                    type="button"
                    className={`switch ${m.is_public ? "on" : ""}`}
                    onClick={() => handleTogglePublic(m)}
                    role="switch"
                    aria-checked={m.is_public}
                    aria-label={`${m.name} 공개 여부`}
                  />
                </td>
                <td style={{ padding: "10px 14px", maxWidth: 200 }}>
                  <div style={{ fontSize: 12, color: "var(--mf)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.public_bio || "—"}
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(m.specialties || []).slice(0, 3).map((s) => (
                      <span key={s} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 999, color: "var(--mf)" }}>{s}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <button className="btn sm ghost icon-only" onClick={() => openEdit(m)} aria-label="편집">
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" style={{ maxWidth: 420 }}>
          <SheetHeader>
            <SheetTitle>{editMember?.name} 프로필 편집</SheetTitle>
          </SheetHeader>
          <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 0 }}>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                공개 여부
                <button type="button" className={`switch ${isPublic ? "on" : ""}`} onClick={() => setIsPublic((v) => !v)} role="switch" aria-checked={isPublic} />
              </label>
            </div>
            <div className="field">
              <label>공개 소개 <span className="hint">max 500자</span></label>
              <textarea className="textarea" rows={4} value={publicBio} onChange={(e) => setPublicBio(e.target.value)} maxLength={500} />
            </div>
            <div className="field">
              <label>특기</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SPECIALTY_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    style={{
                      padding: "4px 10px",
                      border: `1px solid ${specialties.includes(s) ? "var(--fg)" : "var(--border)"}`,
                      borderRadius: 999,
                      fontSize: 12,
                      background: specialties.includes(s) ? "var(--fg)" : "#fff",
                      color: specialties.includes(s) ? "#fff" : "var(--fg)",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>프로필 사진</label>
              <ImageUploader
                value={profileImageUrl}
                kind="members"
                onChange={setProfileImageUrl}
                onClear={() => setProfileImageUrl("")}
              />
            </div>
            <button className="btn primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
