import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { ProjectRecruitmentApplyForm } from "@/components/project/ProjectRecruitmentApplyForm";
import { ScheduleVotingForm } from "@/components/project/ScheduleVotingForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Banknote, Clock, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  free: "무료",
  paid: "유료",
  participation_fee: "참가비",
};

function formatDateTimeKR(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: projectData, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("visibility", "public")
    .single();
  if (error || !projectData) notFound();

  const project = {
    name: projectData.name,
    description: projectData.description,
    poster_url: projectData.poster_url,
    project_type: projectData.project_type,
    starts_at: projectData.starts_at,
    ends_at: projectData.ends_at,
    club_id: projectData.club_id,
    participation_fee: projectData.participation_fee ?? 0,
    recruitment_start_at: projectData.recruitment_start_at,
    recruitment_deadline_at: projectData.recruitment_deadline_at,
    schedule_undecided: projectData.schedule_undecided ?? false,
  };

  const { data: club } = await supabase
    .from("clubs")
    .select("name")
    .eq("id", projectData.club_id)
    .single();
  const clubName = club?.name ?? null;

  const { count: scheduleDateCount } = await supabase
    .from("project_schedule_dates")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  const hasScheduleDates = (scheduleDateCount ?? 0) > 0;

  const now = new Date();
  const isRecruitmentOpen =
    (!project.recruitment_start_at || new Date(project.recruitment_start_at) <= now) &&
    (!project.recruitment_deadline_at || new Date(project.recruitment_deadline_at) >= now);

  return (
    <div className="flex flex-col">
      <MobileHeader title="이벤트" backHref="/events" />
      <div className="flex-1">
        {/* 포스터 */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {project.poster_url ? (
            <img
              src={project.poster_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted" />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className="bg-white/90 text-foreground">
              {typeLabel[project.project_type] ?? project.project_type}
            </Badge>
            <h1 className="mt-2 text-xl font-bold text-white drop-shadow-md">
              {project.name}
            </h1>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          {clubName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4" />
              주최: {clubName}
            </div>
          )}

          {/* 모집 기간 */}
          {(project.recruitment_start_at || project.recruitment_deadline_at) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    모집 기간
                  </h2>
                </div>
                <div className="text-sm text-foreground">
                  {project.recruitment_start_at &&
                    formatDateTimeKR(project.recruitment_start_at)}
                  {project.recruitment_deadline_at && (
                    <> ~ {formatDateTimeKR(project.recruitment_deadline_at)}</>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 프로젝트 일정 */}
          {project.schedule_undecided ? (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="size-4" />
              <span>일정 미정 — 아래에서 가능한 일정을 투표해주세요</span>
            </div>
          ) : project.starts_at ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="size-4 text-muted-foreground" />
              {new Date(project.starts_at).toLocaleDateString("ko-KR")}
              {project.ends_at && project.ends_at !== project.starts_at
                ? ` ~ ${new Date(project.ends_at).toLocaleDateString("ko-KR")}`
                : ""}
            </div>
          ) : null}

          {/* 참여비 */}
          {project.participation_fee > 0 && (
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    참여 비용
                  </h2>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {project.participation_fee.toLocaleString("ko-KR")}원
                </p>
              </CardContent>
            </Card>
          )}

          {project.description && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 일정 투표 */}
          {hasScheduleDates && (
            <div>
              <ScheduleVotingForm projectId={id} />
            </div>
          )}

          {/* 지원 폼 */}
          {isRecruitmentOpen && (
            <div>
              <ProjectRecruitmentApplyForm projectId={id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
