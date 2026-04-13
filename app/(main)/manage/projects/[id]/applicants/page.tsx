import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ApplicantStatusToggle } from "@/components/project/ApplicantStatusToggle";
import { ManualApplicantForm } from "@/components/project/ManualApplicantForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Banknote, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

function formatFee(fee: number): string {
  if (fee === 0) return "무료";
  return `${fee.toLocaleString("ko-KR")}원`;
}

export default async function ProjectApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, start_date, end_date, budget, status")
    .eq("id", projectId)
    .single();
  if (projectErr || !project) notFound();

  const { data: appRows } = await supabase
    .from("project_applications")
    .select("id, user_id, status, created_at, guest_name, guest_phone")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const userIds = [
    ...new Set(
      (appRows ?? [])
        .map((a) => a.user_id)
        .filter((id): id is string => id != null)
    ),
  ];
  const { data: users } =
    userIds.length > 0
      ? await supabase.from("users").select("id, name, email").in("id", userIds)
      : { data: [] };
  const userMap = Object.fromEntries(
    (users ?? []).map((u) => [u.id, u])
  );

  const applicants = (appRows ?? []).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    status: a.status,
    created_at: a.created_at,
    user_name: a.user_id ? (userMap[a.user_id]?.name ?? "회원") : "",
    user_email: a.user_id ? (userMap[a.user_id]?.email ?? "") : "",
    guest_name: a.guest_name ?? null,
    guest_phone: a.guest_phone ?? null,
  }));

  const fee = project.budget ?? 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Link href="/manage">
          <Button variant="ghost" size="icon" className="size-9 rounded-full">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {project.title} · 지원자
          </h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {project.start_date && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="size-3" />
              {new Date(project.start_date).toLocaleDateString("ko-KR")}
            </Badge>
          )}
          <Badge
            variant={fee === 0 ? "secondary" : "default"}
            className="gap-1 text-xs"
          >
            <Banknote className="size-3" />
            {formatFee(fee)}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          지원자를 확인하고 <strong>확정</strong> 또는 <strong>보류</strong>{" "}
          처리할 수 있습니다.
        </p>

        <ManualApplicantForm projectId={projectId} />

        <ApplicantStatusToggle applicants={applicants} projectId={projectId} />
      </div>
    </div>
  );
}
