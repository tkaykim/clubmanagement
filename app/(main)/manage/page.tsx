import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  FolderOpen,
  Plus,
  FileEdit,
  Users,
  Banknote,
  CalendarDays,
  UserCog,
} from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planning: "기획",
  recruiting: "모집 중",
  scheduled: "예정",
  in_progress: "진행 중",
  ongoing: "진행 중",
  completed: "종료",
  ended: "종료",
  cancelled: "취소",
};

export default async function ManagePage() {
  const supabase = createServerSupabaseClient();

  type ProjectRow = {
    id: string;
    title: string;
    status: string;
    start_date: string | null;
    budget: number | null;
  };

  let projects: ProjectRow[] = [];
  let appCounts: Record<string, number> = {};

  if (supabase) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, status, start_date, budget")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    projects = (data ?? []) as ProjectRow[];

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      const { data: apps } = await supabase
        .from("project_applications")
        .select("project_id")
        .in("project_id", projectIds);
      for (const a of apps ?? []) {
        appCounts[a.project_id] = (appCounts[a.project_id] ?? 0) + 1;
      }
    }
  }

  return (
    <div>
      <MobileHeader title="관리" />
      <div className="px-4 py-4">
      {/* 멤버 관리 바로가기 */}
      <Link href="/manage/members">
        <Card className="mb-4 border-0 shadow-sm transition-shadow active:shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UserCog className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">멤버 관리</p>
              <p className="text-xs text-muted-foreground">
                팀원 추가·삭제, 운영진 지정·해제
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          프로젝트
        </p>
        <Link href="/manage/projects/new">
          <Button size="sm" className="gap-1.5 rounded-lg">
            <Plus className="size-4" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="border-0 bg-muted/30">
          <CardContent className="py-10 text-center">
            <FolderOpen className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              등록된 프로젝트가 없습니다.
            </p>
            <Link href="/manage/projects/new">
              <Button className="mt-4 rounded-xl gap-1.5">
                <Plus className="size-4" />
                첫 프로젝트 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="border-0 shadow-sm transition-shadow active:shadow-md"
            >
              <CardContent className="p-4">
                <Link
                  href={`/projects/${p.id}`}
                  className="flex min-w-0 flex-row items-center gap-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <FolderOpen className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {statusLabel[p.status] ?? p.status}
                      </Badge>
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Banknote className="size-3" />
                        {(p.budget ?? 0) === 0
                          ? "무료"
                          : `${(p.budget ?? 0).toLocaleString()}원`}
                      </span>
                    </div>
                    {p.start_date && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(p.start_date).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/manage/projects/${p.id}/applicants`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 rounded-lg"
                    >
                      <Users className="size-4" />
                      지원자{" "}
                      {appCounts[p.id] ? `(${appCounts[p.id]})` : ""}
                    </Button>
                  </Link>
                  <Link href={`/manage/projects/${p.id}/schedule`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-lg"
                    >
                      <CalendarDays className="size-4" />
                      일정
                    </Button>
                  </Link>
                  <Link href={`/manage/projects/${p.id}/form`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-lg"
                    >
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
