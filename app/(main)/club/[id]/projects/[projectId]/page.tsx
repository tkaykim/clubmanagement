import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { ProjectRecruitmentApplyForm } from "@/components/project/ProjectRecruitmentApplyForm";
import { ScheduleVotingForm } from "@/components/project/ScheduleVotingForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Banknote,
  Building2,
  Users,
  Clock,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  planning: "기획",
  scheduled: "예정",
  in_progress: "진행 중",
  ongoing: "진행 중",
  completed: "종료",
  ended: "종료",
  cancelled: "취소",
};

function formatFee(fee: number): string {
  if (fee === 0) return "무료";
  return `${fee.toLocaleString("ko-KR")}원`;
}

function formatDateKR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

function formatDateTimeKR(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRecruitmentStatus(startAt: string | null, deadlineAt: string | null): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const now = new Date();
  if (startAt && new Date(startAt) > now) {
    return { label: "모집 예정", variant: "outline" };
  }
  if (deadlineAt && new Date(deadlineAt) < now) {
    return { label: "모집 마감", variant: "destructive" };
  }
  if (startAt && deadlineAt) {
    return { label: "모집 중", variant: "default" };
  }
  return { label: "모집 중", variant: "default" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: clubId, projectId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("club_id", clubId)
    .single();
  if (error || !project) notFound();

  const { data: club } = await supabase
    .from("clubs")
    .select("name, name_ko, name_en")
    .eq("id", clubId)
    .single();
  if (!club) notFound();

  const { count: applicantCount } = await supabase
    .from("project_applications")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: scheduleDateCount } = await supabase
    .from("project_schedule_dates")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const fee = project.participation_fee ?? 0;
  const clubName = club.name_ko || club.name_en || club.name;
  const hasScheduleDates = (scheduleDateCount ?? 0) > 0;
  const recruitmentStatus = getRecruitmentStatus(
    project.recruitment_start_at,
    project.recruitment_deadline_at
  );
  const isRecruitmentOpen =
    recruitmentStatus.label === "모집 중";

  return (
    <div className="flex flex-col">
      <MobileHeader title={project.name} backHref={`/clubs/${clubId}`} />

      <div className="flex-1">
        {/* 포스터 */}
        {project.poster_url ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={project.poster_url}
              alt={project.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-xl font-bold text-white drop-shadow-md">
                {project.name}
              </h1>
            </div>
          </div>
        ) : (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-xl font-bold text-foreground">
                {project.name}
              </h1>
            </div>
          </div>
        )}

        <div className="px-4 py-5 space-y-4">
          {/* 주최 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4 shrink-0" />
            <span>주최: {clubName}</span>
          </div>

          {/* 뱃지들 */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {statusLabel[project.status] ?? project.status}
            </Badge>
            <Badge variant={recruitmentStatus.variant}>
              {recruitmentStatus.label}
            </Badge>
            <Badge
              variant={fee === 0 ? "secondary" : "default"}
              className="gap-1"
            >
              <Banknote className="size-3.5" />
              {formatFee(fee)}
            </Badge>
          </div>

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
                    <>
                      {" "}
                      ~ {formatDateTimeKR(project.recruitment_deadline_at)}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 프로젝트 일정 */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  프로젝트 일정
                </h2>
              </div>
              {project.schedule_undecided ? (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="size-4" />
                  <span>일정 미정 — 아래에서 가능한 일정을 투표해주세요</span>
                </div>
              ) : project.starts_at ? (
                <p className="text-sm text-foreground">
                  {formatDateKR(project.starts_at)}
                  {project.ends_at && project.ends_at !== project.starts_at
                    ? ` ~ ${formatDateKR(project.ends_at)}`
                    : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">일정 없음</p>
              )}
            </CardContent>
          </Card>

          {/* 지원자 수 */}
          {applicantCount !== null && applicantCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4 shrink-0" />
              <span>현재 지원자 {applicantCount}명</span>
            </div>
          )}

          {/* 프로젝트 소개 */}
          {project.description && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  프로젝트 소개
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 참여 비용 안내 */}
          {fee > 0 && (
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    참여 비용
                  </h2>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatFee(fee)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  프로젝트 참여 시 발생하는 비용입니다.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 일정 투표 */}
          {hasScheduleDates && (
            <div className="pt-2">
              <ScheduleVotingForm projectId={projectId} />
            </div>
          )}

          {/* 지원 폼 */}
          {isRecruitmentOpen && (
            <div className="pt-2">
              <ProjectRecruitmentApplyForm projectId={projectId} />
            </div>
          )}

          {!isRecruitmentOpen && recruitmentStatus.label === "모집 마감" && (
            <Card className="border-0 shadow-sm bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">모집이 마감되었습니다.</p>
              </CardContent>
            </Card>
          )}

          {!isRecruitmentOpen && recruitmentStatus.label === "모집 예정" && (
            <Card className="border-0 shadow-sm bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {project.recruitment_start_at &&
                    `${formatDateTimeKR(project.recruitment_start_at)}부터 모집이 시작됩니다.`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
