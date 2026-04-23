"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GenreBadge } from "../GenreBadge";
import type { PortfolioSectionKey } from "@/lib/types";

interface SectionEditorProps {
  sections: Record<PortfolioSectionKey, string>;
}

const SECTION_FIELDS: { key: PortfolioSectionKey; label: string; type: "input" | "textarea" | "email" | "tel"; placeholder?: string }[] = [
  { key: "hero_title", label: "히어로 제목", type: "input", placeholder: "ONESHOT 크루" },
  { key: "hero_subtitle", label: "히어로 부제목", type: "input", placeholder: "팀 소개 한 줄" },
  { key: "about_team", label: "팀 소개 (about_team)", type: "textarea", placeholder: "팀 소개 텍스트를 입력하세요..." },
  { key: "genres", label: "장르 (쉼표로 구분)", type: "input", placeholder: "K-pop, 한국무용, 현대무용" },
  { key: "contact_email", label: "연락처 이메일", type: "email", placeholder: "oneshot@example.com" },
  { key: "contact_phone", label: "연락처 전화", type: "tel", placeholder: "010-0000-0000" },
];

export function SectionEditor({ sections }: SectionEditorProps) {
  const [values, setValues] = useState<Record<PortfolioSectionKey, string>>({ ...sections });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(values)
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => ({ key, value }));

      const res = await fetch("/api/portfolio/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: payload }),
      });

      if (res.ok) {
        toast.success("저장되었습니다");
      } else {
        toast.error("저장에 실패했습니다");
      }
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const genreBadges = values["genres"]
    ? values["genres"].split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  return (
    <div>
      {SECTION_FIELDS.map((field) => (
        <div key={field.key} className="field">
          <label>{field.label}</label>
          {field.type === "textarea" ? (
            <textarea
              className="textarea"
              rows={6}
              value={values[field.key] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          ) : (
            <input
              className="input"
              type={field.type}
              value={values[field.key] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          )}
          {field.key === "genres" && genreBadges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {genreBadges.map((g) => (
                <GenreBadge key={g} genre={g} />
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
