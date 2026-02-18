import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users, UserPlus, FolderOpen, ListTodo, Calendar, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

const menuItems = [
  { key: "members", label: "회원 관리", icon: Users, href: "members" },
  { key: "applications", label: "지원자", icon: UserPlus, href: "applications" },
  { key: "projects", label: "프로젝트", icon: FolderOpen, href: "projects" },
  { key: "tasks", label: "할일", icon: ListTodo, href: "tasks" },
  { key: "schedule", label: "일정", icon: Calendar, href: "schedule" },
  { key: "settings", label: "동아리 설정", icon: Settings, href: "settings" },
];

export default async function ClubManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
  if (!club) notFound();

  const [m, a, p, s] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("club_id", id).eq("status", "approved"),
    supabase.from("club_applications").select("id", { count: "exact", head: true }).eq("club_id", id).eq("status", "pending"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("club_id", id),
    supabase.from("schedules").select("id", { count: "exact", head: true }).eq("club_id", id),
  ]);

  const projectIds = (await supabase.from("projects").select("id").eq("club_id", id)).data?.map((x) => x.id) ?? [];
  let tasksCount = 0;
  if (projectIds.length > 0) {
    const tRes = await supabase.from("tasks").select("id", { count: "exact", head: true }).in("project_id", projectIds);
    tasksCount = tRes.count ?? 0;
  }

  const counts: Record<string, number> = {
    members: m.count ?? 0,
    applications: a.count ?? 0,
    projects: p.count ?? 0,
    tasks: tasksCount,
    schedule: s.count ?? 0,
    settings: 0,
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 py-5">
        <p className="mb-1 text-sm text-muted-foreground">{club.name}</p>
        <p className="mb-5 text-xs text-muted-foreground">리더·관리자 메뉴입니다.</p>
        <div className="space-y-2">
          {menuItems.map(({ key, label, icon: Icon, href }) => (
            <Link key={key} href={`/club/${id}/manage/${href}`}>
              <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                <CardContent className="flex flex-row items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">{label}</span>
                  {counts[key] !== undefined && counts[key] > 0 && (
                    <Badge variant="secondary" className="text-xs">{counts[key]}</Badge>
                  )}
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
