import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockClubById, getMockProjectsByClubId } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FolderOpen } from "lucide-react";

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

  let clubName = "";
  let projects: { id: string; name: string; status: string; starts_at: string | null; visibility: string }[] = [];

  if (supabase) {
    const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
    if (!club) {
      const mock = getMockClubById(id);
      if (!mock) notFound();
      clubName = mock.name;
      projects = getMockProjectsByClubId(id).map((p) => ({ id: p.id, name: p.name, status: p.status, starts_at: p.starts_at, visibility: p.visibility }));
    } else {
      clubName = club.name;
      const { data } = await supabase.from("projects").select("id, name, status, starts_at, visibility").eq("club_id", id).order("starts_at", { ascending: false });
      projects = data ?? [];
    }
  } else {
    const mock = getMockClubById(id);
    if (!mock) notFound();
    clubName = mock.name;
    projects = getMockProjectsByClubId(id).map((p) => ({ id: p.id, name: p.name, status: p.status, starts_at: p.starts_at, visibility: p.visibility }));
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {clubName} 프로젝트 목록입니다.
        </p>
        {projects.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <FolderOpen className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={p.visibility === "public" ? `/events/${p.id}` : `/club/${id}/manage/projects`}>
                <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                  <CardContent className="flex flex-row items-center gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <FolderOpen className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{statusLabel[p.status] ?? p.status}</Badge>
                        {p.visibility === "public" && <Badge className="text-xs">공개</Badge>}
                      </div>
                      {p.starts_at && (
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(p.starts_at).toLocaleDateString("ko-KR")}</p>
                      )}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
