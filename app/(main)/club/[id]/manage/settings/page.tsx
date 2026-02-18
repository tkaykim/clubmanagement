import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockClubById } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default async function ClubManageSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  let club: { name: string; description: string | null; category: string; max_members: number; is_recruiting: boolean } | null = null;

  if (supabase) {
    const { data, error } = await supabase.from("clubs").select("name, description, category, max_members, is_recruiting").eq("id", id).single();
    if (error || !data) {
      const mock = getMockClubById(id);
      if (!mock) notFound();
      club = { name: mock.name, description: mock.description, category: mock.category, max_members: mock.max_members, is_recruiting: mock.is_recruiting };
    } else {
      club = data;
    }
  } else {
    const mock = getMockClubById(id);
    if (!mock) notFound();
    club = { name: mock.name, description: mock.description, category: mock.category, max_members: mock.max_members, is_recruiting: mock.is_recruiting };
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-5 text-sm text-muted-foreground">
          동아리 정보와 모집 설정을 변경할 수 있습니다.
        </p>
        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-5 p-4">
            <div className="space-y-2">
              <Label htmlFor="name">동아리 이름</Label>
              <Input id="name" defaultValue={club.name} className="rounded-lg" placeholder="동아리 이름" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Input id="category" defaultValue={club.category} className="rounded-lg" placeholder="예: 댄스, 밴드" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">소개</Label>
              <Textarea id="description" defaultValue={club.description ?? ""} className="min-h-[100px] rounded-lg" placeholder="동아리 소개" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_members">최대 회원 수</Label>
              <Input id="max_members" type="number" defaultValue={club.max_members} className="rounded-lg" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="font-medium text-foreground">회원 모집 열기</p>
                <p className="text-xs text-muted-foreground">모집 중일 때만 지원을 받습니다.</p>
              </div>
              <div className="flex h-9 w-12 items-center rounded-full bg-muted px-1">
                <div className={`size-7 rounded-full bg-primary ${club.is_recruiting ? "translate-x-4" : "translate-x-0"} transition-transform`} />
              </div>
            </div>
            <Button className="w-full rounded-xl">저장하기</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
