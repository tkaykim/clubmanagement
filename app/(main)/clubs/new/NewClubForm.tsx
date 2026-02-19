"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CategoryMajor = { id: string; name: string };

type Props = { categories: CategoryMajor[] };

export function NewClubForm({ categories }: Props) {
  const router = useRouter();
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [categoryMajorId, setCategoryMajorId] = useState<string>("");
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ko = nameKo.trim();
    const en = nameEn.trim();
    if (!ko && !en) {
      setError("동아리 이름(한글 또는 영문)을 입력해 주세요.");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      router.push("/login");
      return;
    }

    // public.users에 본인 행이 있어야 owner_id FK 통과. 없으면 생성
    const { error: userErr } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string)?.trim() || user.email?.split("@")[0] || "회원",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (userErr) {
      setError("프로필 동기화에 실패했습니다. 다시 시도해 주세요.");
      setLoading(false);
      return;
    }

    const categoryName = categoryMajorId
      ? categories.find((c) => c.id === categoryMajorId)?.name ?? "일반"
      : "일반";

    const { data: club, error: clubErr } = await supabase
      .from("clubs")
      .insert({
        owner_id: user.id,
        name_ko: ko || null,
        name_en: en || null,
        description: description.trim() || null,
        category: categoryName,
        category_major_id: categoryMajorId || null,
        is_recruiting: isRecruiting,
      })
      .select("id")
      .single();

    if (clubErr) {
      setError(clubErr.message ?? "동아리 생성에 실패했습니다.");
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase.from("members").insert({
      club_id: club.id,
      user_id: user.id,
      role: "owner",
      status: "approved",
    });

    if (memberErr) {
      setError("동아리 생성 후 멤버 등록에 실패했습니다.");
      setLoading(false);
      return;
    }

    router.push(`/club/${club.id}/manage`);
    router.refresh();
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">새 동아리 정보</h2>
        <p className="text-sm text-muted-foreground">
          한글 이름 또는 영문 이름 중 하나는 꼭 입력해 주세요.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name_ko">동아리 이름 (한글)</Label>
            <Input
              id="name_ko"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 우동 개발팀"
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_en">동아리 이름 (영문, 선택)</Label>
            <Input
              id="name_en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="예: Udong Dev"
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">소개 (선택)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="동아리를 한 줄로 소개해 보세요."
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <Label>카테고리</Label>
            <Select value={categoryMajorId || "none"} onValueChange={(v) => setCategoryMajorId(v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="선택 (선택 안 하면 일반)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">선택 안 함 (일반)</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recruiting"
              checked={isRecruiting}
              onChange={(e) => setIsRecruiting(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            <Label htmlFor="is_recruiting" className="cursor-pointer text-sm font-normal">
              지금 회원 모집 중으로 표시하기
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 rounded-xl" disabled={loading}>
              {loading ? "생성 중…" : "동아리 만들기"}
            </Button>
            <Link href="/clubs">
              <Button type="button" variant="outline" className="rounded-xl" disabled={loading}>
                취소
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
