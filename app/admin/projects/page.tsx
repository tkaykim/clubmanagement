import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planning: "기획",
  scheduled: "예정",
  in_progress: "진행 중",
  ongoing: "진행 중",
  completed: "종료",
  ended: "종료",
};

export default async function AdminProjectsPage() {
  const supabase = createServerSupabaseClient();

  let projects: { id: string; name: string; status: string; club_id: string; visibility: string }[] = [];
  let clubByName: Record<string, string> = {};

  if (supabase) {
    const { data } = await supabase.from("projects").select("id, name, status, club_id, visibility").order("starts_at", { ascending: false });
    projects = data ?? [];
    const clubIds = [...new Set(projects.map((p) => p.club_id).filter(Boolean))] as string[];
    const { data: clubList } = await supabase.from("clubs").select("id, name").in("id", clubIds);
    clubByName = Object.fromEntries((clubList ?? []).map((c) => [c.id, c.name]));
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          전체 프로젝트 목록입니다.
        </p>
        <div className="space-y-2">
          {projects.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>
          )}
          {projects.map((p) => (
            <Link key={p.id} href={p.visibility === "public" ? `/events/${p.id}` : `/club/${p.club_id}/manage/projects`}>
              <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                <CardContent className="flex flex-row items-center gap-3 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <FolderOpen className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{clubByName[p.club_id] ?? ""}</p>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{statusLabel[p.status] ?? p.status}</Badge>
                      {p.visibility === "public" && <Badge className="text-xs">공개</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
