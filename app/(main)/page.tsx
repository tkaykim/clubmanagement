import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FolderOpen, Banknote, Calendar, Clock } from "lucide-react";

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

function formatFee(fee: number): string {
  if (!fee || fee === 0) return "무료";
  return `${fee.toLocaleString("ko-KR")}원`;
}

function getRecruitmentBadge(
  startAt: string | null,
  deadlineAt: string | null
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } | null {
  const now = new Date();
  if (startAt && new Date(startAt) > now) {
    return { label: "모집 예정", variant: "outline" };
  }
  if (deadlineAt && new Date(deadlineAt) < now) {
    return { label: "모집 마감", variant: "destructive" };
  }
  if (startAt || deadlineAt) {
    return { label: "모집 중", variant: "default" };
  }
  return null;
}

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  type ProjectRow = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    poster_url: string | null;
    start_date: string | null;
    end_date: string | null;
    budget: number | null;
    recruitment_start_at: string | null;
    due_date: string | null;
    schedule_undecided: boolean;
  };

  let projects: ProjectRow[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, description, status, poster_url, start_date, end_date, budget, recruitment_start_at, due_date, schedule_undecided")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    projects = (data ?? []) as ProjectRow[];
  }

  const activeProjects = projects.filter((p) =>
    ["planning", "recruiting", "scheduled", "in_progress", "ongoing"].includes(p.status)
  );
  const pastProjects = projects.filter((p) =>
    ["completed", "ended", "cancelled"].includes(p.status)
  );

  return (
    <div className="flex flex-col">
      <HomeHeader />

      <div className="px-4 py-5 space-y-6">
        {/* 진행 중인 프로젝트 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            진행 중인 프로젝트
          </h2>

          {activeProjects.length === 0 ? (
            <Card className="border-0 bg-muted/30">
              <CardContent className="py-10 text-center">
                <FolderOpen className="mx-auto size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  진행 중인 프로젝트가 없습니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((p) => {
                const fee = p.budget ?? 0;
                const badge = getRecruitmentBadge(p.recruitment_start_at, p.due_date);

                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <Card className="overflow-hidden border-0 shadow-sm transition-shadow active:shadow-md">
                      {p.poster_url && (
                        <div className="aspect-[21/9] w-full overflow-hidden bg-muted">
                          <img
                            src={p.poster_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground">
                              {p.title}
                            </h3>
                            {p.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {p.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {statusLabel[p.status] ?? p.status}
                          </Badge>
                          {badge && (
                            <Badge variant={badge.variant} className="text-xs">
                              {badge.label}
                            </Badge>
                          )}
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Banknote className="size-3" />
                            {formatFee(fee)}
                          </span>
                        </div>

                        {p.start_date && !p.schedule_undecided && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            {new Date(p.start_date).toLocaleDateString("ko-KR")}
                            {p.end_date && p.end_date !== p.start_date
                              ? ` ~ ${new Date(p.end_date).toLocaleDateString("ko-KR")}`
                              : ""}
                          </div>
                        )}

                        {p.schedule_undecided && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                            <Clock className="size-3" />
                            일정 미정 (투표 진행 중)
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 지난 프로젝트 */}
        {pastProjects.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-muted-foreground">
              지난 프로젝트
            </h2>
            <div className="space-y-2">
              {pastProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="border-0 shadow-sm opacity-70 transition-shadow active:shadow-md">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FolderOpen className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {p.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {statusLabel[p.status] ?? p.status}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
