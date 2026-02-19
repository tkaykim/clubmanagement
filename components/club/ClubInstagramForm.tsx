"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  clubId: string;
  initialUrl: string | null;
};

export function ClubInstagramForm({ clubId, initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const value = url.trim();
    let stored = value || null;
    if (value && !value.startsWith("http") && !value.startsWith("@")) {
      stored = value.startsWith("instagram.com") ? `https://${value}` : `https://instagram.com/${value.replace(/^@/, "")}`;
    } else if (value && value.startsWith("@")) {
      stored = `https://instagram.com/${value.slice(1)}`;
    }
    setSaving(true);
    const { error: err } = await supabase.from("clubs").update({ instagram_url: stored }).eq("id", clubId);
    setSaving(false);
    if (err) {
      setError("저장에 실패했습니다.");
      return;
    }
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="instagram_url">공식 인스타그램</Label>
      <Input
        id="instagram_url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="rounded-lg"
        placeholder="https://instagram.com/... 또는 @계정명"
      />
      <p className="text-xs text-muted-foreground">전체 URL 또는 @계정명을 입력하세요.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-muted-foreground">저장되었습니다.</p>}
      <Button type="submit" size="sm" disabled={saving} className="rounded-lg">
        {saving ? "저장 중…" : "인스타그램 저장"}
      </Button>
    </form>
  );
}
