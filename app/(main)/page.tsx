import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { HomeHeader } from "@/components/layout/HomeHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FolderOpen, Banknote, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  recruiting: "모집 중",
  in_progress: "진행 중",
  completed: "종료",
  cancelled: "취소",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  recruiting: "default",
  in_progress: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

function formatFee(fee: number | null): string | null {
  if (!fee || fee === 0) return null;
  return `${fee.toLocaleString("ko-KR")}원`;
}

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  poster_url: string | null;
  start_date: string | null;
  fee: number | null;
  created_at: string;
};

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  let projects: ProjectRow[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, status, poster_url, start_date, fee, created_at")
      .order("created_at", { ascending: false });
    projects = (data ?? []) as ProjectRow[];
  }

  const activeProjects = projects.filter((p) =>
    ["recruiting", "in_progress"].includes(p.status)
  );
  const pastProjects = projects
    .filter((p) => ["completed", "cancelled"].includes(p.status))
    .slice(0, 5);

  const isEmpty = projects.length === 0;

  return (
    <div className="flex flex-col">
      <HomeHeader />

      <div className="px-4 py-5 space-y-6">
        {isEmpty ? (
          <Card className="border-0 bg-muted/30">
            <CardContent className="py-14 text-center">
              <FolderOpen className="mx-auto size-12 text-muted-foreground/40" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                등록된 프로젝트가 없습니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
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
                      진행 중인 프로젝트가 없습니다
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeProjects.map((p) => (
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
                            <h3 className="min-w-0 flex-1 font-semibold text-foreground">
                              {p.title}
                            </h3>
                            <ChevronRight className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge variant={statusVariant[p.status] ?? "outline"} className="text-xs">
                              {statusLabel[p.status] ?? p.status}
                            </Badge>
                            {formatFee(p.fee) && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Banknote className="size-3" />
                                {formatFee(p.fee)}
                              </span>
                            )}
                          </div>

                          {p.start_date && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="size-3" />
                              {new Date(p.start_date).toLocaleDateString("ko-KR")}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
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
                            <div className="mt-0.5 flex items-center gap-2">
                              <Badge variant={statusVariant[p.status] ?? "outline"} className="text-[10px] px-1.5 py-0">
                                {statusLabel[p.status] ?? p.status}
                              </Badge>
                              {formatFee(p.fee) && (
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                  <Banknote className="size-3" />
                                  {formatFee(p.fee)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
