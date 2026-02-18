"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Interest } from "@/lib/types";

type Props = {
  clubId: string;
  initialInterestIds: string[];
};

export function ClubInterestEditor({ clubId, initialInterestIds }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialInterestIds));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("interests")
      .select("id, name, sort_order, created_at")
      .order("sort_order")
      .then(({ data }) => setInterests((data as Interest[]) ?? []));
    setLoading(false);
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setMessage(null);
    setSaving(true);
    const { error: delErr } = await supabase.from("club_interests").delete().eq("club_id", clubId);
    if (delErr) {
      setMessage({ type: "error", text: "저장에 실패했습니다." });
      setSaving(false);
      return;
    }
    if (selected.size > 0) {
      const rows = Array.from(selected).map((interest_id) => ({ club_id: clubId, interest_id }));
      const { error: insErr } = await supabase.from("club_interests").insert(rows);
      if (insErr) {
        setMessage({ type: "error", text: "저장에 실패했습니다." });
        setSaving(false);
        return;
      }
    }
    setMessage({ type: "ok", text: "저장되었습니다." });
    setSaving(false);
  }

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;

  return (
    <div className="space-y-2">
      <Label>관심사 태그 (동아리와 맞는 항목을 선택하세요)</Label>
      <div className="flex flex-wrap gap-2">
        {interests.map((i) => (
          <Badge
            key={i.id}
            variant={selected.has(i.id) ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => toggle(i.id)}
          >
            {i.name}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-lg">
          {saving ? "저장 중…" : "태그 저장"}
        </Button>
        {message && (
          <span className={message.type === "error" ? "text-destructive" : "text-muted-foreground"}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
