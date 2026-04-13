import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, FolderOpen, Plus, FileEdit, Users, Banknote, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planning: "기획", scheduled: "예정", in_progress: "진행 중", ongoing: "진행 중", completed: "종료", ended: "종료",
};

export default async function ClubManageProjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
  if (!club) notFound();

  const { data: projects } = await supabase.from("projects").select("id, name, status, starts_at, visibility, participation_fee").eq("club_id", id).order("starts_at", { ascending: false });
  const projectList = projects ?? [];

  const projectIds = projectList.map((p) => p.id);
  let appCounts: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: apps } = await supabase
      .from("project_applications")
      .select("project_id")
      .in("project_id", projectIds);
    for (const a of apps ?? []) {
      appCounts[a.project_id] = (appCounts[a.project_id] ?? 0) + 1;
    }
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{club.name} 프로젝트 목록입니다.</p>
          <Link href={`/club/${id}/manage/projects/new`}>
            <Button size="sm" className="gap-1.5 rounded-lg">
              <Plus className="size-4" />
              프로젝트 추가
            </Button>
          </Link>
        </div>
        {projectList.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <FolderOpen className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projectList.map((p) => (
              <Card key={p.id} className="border-0 shadow-sm transition-shadow active:shadow-md">
                <CardContent className="p-4">
                  <Link href={p.visibility === "public" ? `/events/${p.id}` : `/club/${id}/projects/${p.id}`} className="flex min-w-0 flex-row items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <FolderOpen className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{statusLabel[p.status] ?? p.status}</Badge>
                        {p.visibility === "public" && <Badge className="text-xs">공개</Badge>}
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Banknote className="size-3" />
                          {(p.participation_fee ?? 0) === 0 ? "무료" : `${(p.participation_fee ?? 0).toLocaleString()}원`}
                        </span>
                      </div>
                      {p.starts_at && (
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(p.starts_at).toLocaleDateString("ko-KR")}</p>
                      )}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/club/${id}/manage/projects/${p.id}/applicants`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg">
                        <Users className="size-4" />
                        지원자 {appCounts[p.id] ? `(${appCounts[p.id]})` : ""}
                      </Button>
                    </Link>
                    <Link href={`/club/${id}/manage/projects/${p.id}/schedule`}>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
                        <CalendarDays className="size-4" />
                        일정
                      </Button>
                    </Link>
                    <Link href={`/club/${id}/manage/projects/${p.id}/form`}>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
                        <FileEdit className="size-4" />
                        폼
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
