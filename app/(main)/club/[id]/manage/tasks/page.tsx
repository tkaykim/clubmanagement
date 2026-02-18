import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockClubById } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTodo, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClubManageTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  let clubName = "";
  let tasks: { id: string; title: string; due_date: string | null; status: string; project_name: string }[] = [];

  if (supabase) {
    const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
    if (!club) {
      const mock = getMockClubById(id);
      if (!mock) notFound();
      clubName = mock.name;
      tasks = [
        { id: "t1", title: "대관 일정 잡기", due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), status: "in_progress", project_name: "댄스 영상 촬영" },
        { id: "t2", title: "촬영 장소 확정", due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), status: "todo", project_name: "댄스 영상 촬영" },
      ];
    } else {
      clubName = club.name;
      const { data: t } = await supabase.from("tasks").select("id, title, due_date, status").in("project_id", (await supabase.from("projects").select("id").eq("club_id", id)).data?.map((p) => p.id) ?? []);
      tasks = (t ?? []).map((x) => ({ ...x, project_name: "" }));
    }
  } else {
    const mock = getMockClubById(id);
    if (!mock) notFound();
    clubName = mock.name;
    tasks = [
      { id: "t1", title: "대관 일정 잡기", due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), status: "in_progress", project_name: "댄스 영상 촬영" },
      { id: "t2", title: "촬영 장소 확정", due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), status: "todo", project_name: "댄스 영상 촬영" },
    ];
  }

  const statusLabel: Record<string, string> = { todo: "할 일", in_progress: "진행 중", done: "완료" };

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {clubName} 프로젝트별 할일입니다.
        </p>
        {tasks.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <ListTodo className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">등록된 할일이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <Card key={t.id} className="border-0 shadow-sm">
                <CardContent className="flex flex-row items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <CheckCircle2 className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{t.title}</p>
                    {t.project_name && <p className="text-xs text-muted-foreground">{t.project_name}</p>}
                    {t.due_date && <p className="mt-1 text-xs text-muted-foreground">마감 {new Date(t.due_date).toLocaleDateString("ko-KR")}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs">{statusLabel[t.status] ?? t.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
