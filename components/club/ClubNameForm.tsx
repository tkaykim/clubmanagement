"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  clubId: string;
  initialNameKo: string | null;
  initialNameEn: string | null;
};

export function ClubNameForm({ clubId, initialNameKo, initialNameEn }: Props) {
  const [nameKo, setNameKo] = useState(initialNameKo ?? "");
  const [nameEn, setNameEn] = useState(initialNameEn ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const ko = nameKo.trim();
    const en = nameEn.trim();
    if (!ko && !en) {
      setError("한글 이름과 영어 이름 중 하나는 반드시 입력해 주세요.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("clubs")
      .update({ name_ko: ko || null, name_en: en || null })
      .eq("id", clubId);
    setSaving(false);
    if (err) {
      setError("저장에 실패했습니다.");
      return;
    }
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-2">
        <Label htmlFor="name_ko">한글 이름</Label>
        <Input
          id="name_ko"
          value={nameKo}
          onChange={(e) => setNameKo(e.target.value)}
          className="rounded-lg"
          placeholder="예: 힙합 크루 동아리"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name_en">영어 이름</Label>
        <Input
          id="name_en"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="rounded-lg"
          placeholder="예: Hip-hop Crew"
        />
      </div>
      <p className="text-xs text-muted-foreground">한글·영어 중 하나는 반드시 입력해 주세요.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-muted-foreground">저장되었습니다.</p>}
      <Button type="submit" size="sm" disabled={saving} className="rounded-lg">
        {saving ? "저장 중…" : "이름 저장"}
      </Button>
    </form>
  );
}
