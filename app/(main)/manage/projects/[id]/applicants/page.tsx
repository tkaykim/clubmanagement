import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Badge } from "@/components/ui/badge";
import { Calendar, Banknote } from "lucide-react";
import { ApplicantList } from "./ApplicantList";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type ProjectRow = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  fee: number;
  status: string;
};

type ApplicationRow = {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
};

export type Applicant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR");
}

function formatFee(fee: number): string {
  if (!fee) return "무료";
  return `${fee.toLocaleString("ko-KR")}원`;
}

export default async function ApplicantsPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="지원자" backHref="/manage" />
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          데이터베이스 연결 오류
        </div>
      </div>
    );
  }

  const { data: projectData } = await supabase
    .from("projects")
    .select("id, title, start_date, end_date, fee, status")
    .eq("id", projectId)
    .single();

  const project = projectData as ProjectRow | null;

  if (!project) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="지원자" backHref="/manage" />
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          프로젝트를 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const { data: appData } = await supabase
    .from("project_applications")
    .select("id, user_id, status, created_at, guest_name, guest_phone")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const applications = (appData ?? []) as ApplicationRow[];

  const userIds = applications
    .map((a) => a.user_id)
    .filter((id): id is string => !!id);

  let userMap: Record<string, UserRow> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds);
    for (const u of (usersData ?? []) as UserRow[]) {
      userMap[u.id] = u;
    }
  }

  const applicants: Applicant[] = applications.map((a) => {
    const user = a.user_id ? userMap[a.user_id] : null;
    return {
      id: a.id,
      name: user?.name ?? a.guest_name ?? "이름 없음",
      email: user?.email ?? null,
      phone: a.guest_phone ?? null,
      status: a.status,
      created_at: a.created_at,
    };
  });

  const confirmed = applicants.filter((a) => a.status === "approved").length;
  const pending = applicants.filter((a) => a.status === "pending").length;
  const hold = applicants.filter((a) => a.status === "rejected").length;

  return (
    <div className="flex flex-col">
      <MobileHeader title={`${project.title} · 지원자`} backHref="/manage" />

      <div className="px-4 py-5 space-y-5">
        {/* Project info */}
        <div className="flex flex-wrap gap-2">
          {project.start_date && (
            <Badge variant="outline" className="text-xs gap-1">
              <Calendar className="size-3" />
              {formatDate(project.start_date)}
              {project.end_date && ` ~ ${formatDate(project.end_date)}`}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <Banknote className="size-3" />
            {formatFee(project.fee)}
          </Badge>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "전체", value: applicants.length, variant: "secondary" as const },
            { label: "확정", value: confirmed, variant: "default" as const },
            { label: "대기", value: pending, variant: "outline" as const },
            { label: "보류", value: hold, variant: "destructive" as const },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-lg bg-muted/30 p-3"
            >
              <span className="text-lg font-bold">{s.value}</span>
              <Badge variant={s.variant} className="mt-1 text-[10px] px-1.5 py-0">
                {s.label}
              </Badge>
            </div>
          ))}
        </div>

        {/* Applicant list */}
        <ApplicantList applicants={applicants} />
      </div>
    </div>
  );
}
