"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  clubId: string;
};

export function NewProjectForm({ clubId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [recruitmentDeadlineAt, setRecruitmentDeadlineAt] = useState("");
  const [visibility, setVisibility] = useState<"club_only" | "public">("club_only");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("프로젝트 이름을 입력하세요.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }
    setSubmitting(true);
    const { data: project, error: insertErr } = await supabase
      .from("projects")
      .insert({
        club_id: clubId,
        name: trimmedName,
        description: description.trim() || null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        recruitment_deadline_at: recruitmentDeadlineAt || null,
        visibility,
        created_by: user.id,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message || "생성에 실패했습니다.");
      return;
    }
    router.push(`/club/${clubId}/manage/projects/${project.id}/form`);
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">프로젝트 이름 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2025 정기 공연"
              className="rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 소개"
              className="min-h-[80px] rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="starts_at">시작일</Label>
              <Input
                id="starts_at"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">종료일</Label>
              <Input
                id="ends_at"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recruitment_deadline_at">모집 마감일시</Label>
            <Input
              id="recruitment_deadline_at"
              type="datetime-local"
              value={recruitmentDeadlineAt}
              onChange={(e) => setRecruitmentDeadlineAt(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>공개 범위</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "club_only"}
                  onChange={() => setVisibility("club_only")}
                />
                동아리만
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                전체 공개
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full rounded-xl">
            {submitting ? "생성 중…" : "프로젝트 생성 후 모집 폼 설정"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
