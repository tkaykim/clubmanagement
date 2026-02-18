"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { University } from "@/lib/types";

type Props = {
  clubId: string;
  initialIsUniversityBased: boolean;
  initialUniversityId: string | null;
};

export function ClubUniversityForm({
  clubId,
  initialIsUniversityBased,
  initialUniversityId,
}: Props) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isUniversityBased, setIsUniversityBased] = useState(initialIsUniversityBased);
  const [universityId, setUniversityId] = useState<string | null>(initialUniversityId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("universities")
      .select("id, name, sort_order, created_at")
      .order("sort_order")
      .then(({ data }) => setUniversities((data as University[]) ?? []));
    setLoading(false);
  }, []);

  async function handleSave() {
    setMessage(null);
    setSaving(true);
    const { error } = await supabase
      .from("clubs")
      .update({
        is_university_based: isUniversityBased,
        university_id: isUniversityBased ? (universityId || null) : null,
      })
      .eq("id", clubId);
    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: "저장에 실패했습니다." });
      return;
    }
    setMessage({ type: "ok", text: "저장되었습니다." });
  }

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
        <div>
          <p className="font-medium text-foreground">대학 기반 동아리</p>
          <p className="text-xs text-muted-foreground">특정 대학 소속 동아리인 경우 선택하세요.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isUniversityBased}
          onClick={() => setIsUniversityBased(!isUniversityBased)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isUniversityBased ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
              isUniversityBased ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isUniversityBased && (
        <div className="space-y-2">
          <Label>기반 대학 (선택)</Label>
          <Select
            value={universityId ?? "none"}
            onValueChange={(v) => setUniversityId(v === "none" ? null : v)}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="대학 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              {universities.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-lg">
          {saving ? "저장 중…" : "저장"}
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
