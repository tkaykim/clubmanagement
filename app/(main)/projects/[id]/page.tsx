import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { ScheduleVotingForm } from "@/components/project/ScheduleVotingForm";
import { ProjectApplyForm } from "@/components/project/ProjectApplyForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Banknote, Users, Clock, AlertCircle } from "lucide-react";

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

function getRecruitmentStatus(
  startAt: string | null,
  endAt: string | null,
  applicantCount: number,
  maxParticipants: number | null
) {
  const now = new Date();
  if (startAt && new Date(startAt) > now) return { label: "모집 예정", open: false };
  if (endAt && new Date(endAt + "T23:59:59") < now) return { label: "모집 마감", open: false };
  if (maxParticipants !== null && applicantCount >= maxParticipants)
    return { label: "모집 마감 (정원)", open: false };
  return { label: "모집 중", open: true };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFee(fee: number): string {
  if (!fee || fee === 0) return "무료";
  return `${fee.toLocaleString("ko-KR")}원`;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  if (!supabase) notFound();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  const { count: applicantCount } = await supabase
    .from("project_applications")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: scheduleDateCount } = await supabase
    .from("project_schedule_dates")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const recruitment = getRecruitmentStatus(
    project.recruitment_start_at,
    project.recruitment_end_at,
    applicantCount ?? 0,
    project.max_participants
  );

  const hasScheduleDates = (scheduleDateCount ?? 0) > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <MobileHeader title={project.title} backHref="/" />

      {project.poster_url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.poster_url} alt={project.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
      )}

      <div className="space-y-4 px-4 py-5">
        {/* Title & Badges */}
        <div>
          <h1 className="text-xl font-bold text-foreground">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant[project.status] ?? "outline"}>
              {statusLabel[project.status] ?? project.status}
            </Badge>
            <Badge variant={recruitment.open ? "default" : "secondary"}>
              {recruitment.label}
            </Badge>
            <Badge variant="outline">
              <Banknote className="size-3" />
              {formatFee(project.fee ?? 0)}
            </Badge>
          </div>
        </div>

        {/* 모집 기간 */}
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">모집 기간</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {project.recruitment_start_at
                  ? formatDate(project.recruitment_start_at)
                  : "시작일 미정"}
                {" ~ "}
                {project.recruitment_end_at
                  ? formatDate(project.recruitment_end_at)
                  : "마감일 없음"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 프로젝트 일정 */}
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <Calendar className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">프로젝트 일정</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {project.schedule_undecided
                  ? "미정"
                  : project.start_date
                    ? `${formatDate(project.start_date)}${project.end_date && project.end_date !== project.start_date ? ` ~ ${formatDate(project.end_date)}` : ""}`
                    : "미정"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 지원자 수 */}
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">지원 현황</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                현재 지원자 {applicantCount ?? 0}명
                {project.max_participants
                  ? ` / 최대 ${project.max_participants}명`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 프로젝트 소개 */}
        {project.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground">프로젝트 소개</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 참여 비용 */}
        {(project.fee ?? 0) > 0 && (
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <Banknote className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">참여 비용</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {formatFee(project.fee)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasScheduleDates && <ScheduleVotingForm projectId={projectId} />}

        {recruitment.open && (
          <ProjectApplyForm
            projectId={projectId}
            maxParticipants={project.max_participants}
            currentApplicants={applicantCount ?? 0}
          />
        )}

        {/* Recruitment closed messages */}
        {!recruitment.open && project.status === "recruiting" && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {recruitment.label === "모집 예정"
                  ? `모집이 아직 시작되지 않았습니다. ${project.recruitment_start_at ? formatDate(project.recruitment_start_at) + "부터 지원할 수 있습니다." : ""}`
                  : "모집이 마감되었습니다."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
