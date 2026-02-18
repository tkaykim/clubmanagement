import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminClubsPage() {
  const supabase = createServerSupabaseClient();

  let clubs: { id: string; name: string; category: string; is_recruiting: boolean }[] = [];
  if (supabase) {
    const { data } = await supabase.from("clubs").select("id, name, category, is_recruiting").order("name");
    clubs = data ?? [];
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          등록된 동아리 목록입니다. 동아리를 선택해 상세·관리 페이지로 이동할 수 있습니다.
        </p>
        <div className="space-y-2">
          {clubs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">등록된 동아리가 없습니다.</p>
          )}
          {clubs.map((club) => (
            <Card key={club.id} className="border-0 shadow-sm transition-shadow active:shadow-md">
              <CardContent className="flex flex-row items-center gap-3 p-4">
                <Link href={`/clubs/${club.id}`} className="flex min-w-0 flex-1 flex-row items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Users className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{club.category}</p>
                    <p className="font-medium text-foreground">{club.name}</p>
                    {club.is_recruiting && <Badge variant="secondary" className="mt-1 text-xs">모집 중</Badge>}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
                <Link href={`/club/${club.id}/manage`} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
                  관리
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
