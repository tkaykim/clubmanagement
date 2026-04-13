"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  clubId: string;
  initialCategory: string;
  initialDescription: string;
  initialMaxMembers: number;
  initialIsRecruiting: boolean;
};

export function ClubGeneralSettingsForm({
  clubId,
  initialCategory,
  initialDescription,
  initialMaxMembers,
  initialIsRecruiting,
}: Props) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState(initialDescription);
  const [maxMembers, setMaxMembers] = useState(initialMaxMembers);
  const [isRecruiting, setIsRecruiting] = useState(initialIsRecruiting);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setMessage(null);
    setSaving(true);

    const { error } = await supabase
      .from("clubs")
      .update({
        category: category.trim() || "일반",
        description: description.trim() || null,
        max_members: maxMembers,
        is_recruiting: isRecruiting,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clubId);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: "저장에 실패했습니다: " + error.message });
      return;
    }

    setMessage({ type: "success", text: "저장되었습니다." });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg"
          placeholder="예: 댄스, 밴드"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">소개</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px] rounded-lg"
          placeholder="동아리 소개"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_members">최대 회원 수</Label>
        <Input
          id="max_members"
          type="number"
          min={2}
          max={500}
          value={maxMembers}
          onChange={(e) => setMaxMembers(Number(e.target.value) || 2)}
          className="rounded-lg"
        />
      </div>

      <button
        type="button"
        onClick={() => setIsRecruiting((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50 active:scale-[0.99]"
      >
        <div className="text-left">
          <p className="font-medium text-foreground">회원 모집 열기</p>
          <p className="text-xs text-muted-foreground">
            {isRecruiting
              ? "모집 중 — 지원을 받고 있습니다."
              : "모집 닫힘 — 지원을 받지 않습니다."}
          </p>
        </div>
        <div
          className={`flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-colors duration-200 ${
            isRecruiting ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isRecruiting ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </div>
      </button>

      {message && (
        <p
          className={
            message.type === "error"
              ? "text-sm text-destructive"
              : "text-sm text-primary"
          }
        >
          {message.text}
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl"
      >
        {saving ? "저장 중…" : "저장하기"}
      </Button>
    </div>
  );
}
