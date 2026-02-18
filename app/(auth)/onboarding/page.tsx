"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Interest } from "@/lib/types";

const MBTI_OPTIONS = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [mbti, setMbti] = useState<string | null>(null);
  const [selectedInterestIds, setSelectedInterestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("interests")
        .select("id, name, sort_order, created_at")
        .order("sort_order");
      setInterests((data as Interest[]) ?? []);
      setLoading(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    if (mbti) {
      const { error: err } = await supabase
        .from("users")
        .update({ mbti, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (err) {
        setError("프로필 저장에 실패했습니다.");
        setSaving(false);
        return;
      }
    }

    await supabase.from("user_interests").delete().eq("user_id", user.id);
    if (selectedInterestIds.size > 0) {
      const rows = Array.from(selectedInterestIds).map((interest_id) => ({
        user_id: user.id,
        interest_id,
      }));
      const { error: err2 } = await supabase.from("user_interests").insert(rows);
      if (err2) {
        setError("관심사 저장에 실패했습니다.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/");
    router.refresh();
  }

  function toggleInterest(id: string) {
    setSelectedInterestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-12 text-center text-muted-foreground">
          불러오는 중…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <h1 className="text-xl font-bold text-foreground">프로필 꾸미기</h1>
        <p className="text-sm text-muted-foreground">
          MBTI와 관심사를 알려주시면, 맞춤 동아리를 추천해 드려요.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>MBTI (선택)</Label>
            <div className="flex flex-wrap gap-2">
              {MBTI_OPTIONS.map((type) => (
                <Badge
                  key={type}
                  variant={mbti === type ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => setMbti(mbti === type ? null : type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>관심사 (여러 개 선택 가능)</Label>
            <div className="flex flex-wrap gap-2">
              {interests.map((i) => (
                <Badge
                  key={i.id}
                  variant={selectedInterestIds.has(i.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleInterest(i.id)}
                >
                  {i.name}
                </Badge>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full rounded-xl" disabled={saving}>
            {saving ? "저장 중…" : "완료하고 동아리 둘러보기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
