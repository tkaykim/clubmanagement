import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
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
  if (!supabase) notFound();

  const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
  if (!club) notFound();

  const { data: projectIds } = await supabase.from("projects").select("id").eq("club_id", id);
  const ids = projectIds?.map((p) => p.id) ?? [];
  const { data: t } = ids.length > 0 ? await supabase.from("tasks").select("id, title, due_date, status, project_id").in("project_id", ids) : { data: [] };
  const projects = await (ids.length > 0 ? supabase.from("projects").select("id, name").in("id", ids) : { data: [] as { id: string; name: string }[] });
  const projectByName = Object.fromEntries((projects.data ?? []).map((p) => [p.id, p.name]));
  const tasks = (t ?? []).map((x) => ({ ...x, project_name: projectByName[x.project_id] ?? "" }));

  const statusLabel: Record<string, string> = { todo: "할 일", in_progress: "진행 중", done: "완료" };

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {club.name} 프로젝트별 할일입니다.
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
