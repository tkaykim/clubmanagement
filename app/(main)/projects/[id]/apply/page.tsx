import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ApplyForm } from "@/components/project/ApplyForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ApplyPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, title, status, type, fee, recruitment_end_at, description")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  if (project.status !== "recruiting") {
    redirect(`/projects/${projectId}`);
  }

  // 이미 지원했는지 확인
  const { data: existing } = await supabase
    .from("project_applications")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/projects/${projectId}`);
  }

  // schedule_dates 조회
  const { data: scheduleDates } = await supabase
    .from("schedule_dates")
    .select("id, date, label, kind, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  // 현재 멤버 정보 (이름 자동완성용)
  const { data: member } = await supabase
    .from("crew_members")
    .select("name, stage_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href={`/projects/${projectId}`} className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          프로젝트
        </Link>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 24 }}>{project.title} 지원</h1>
          <div className="sub">아래 항목을 작성해 주세요</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ padding: 24 }}>
          <ApplyForm
            projectId={projectId}
            projectTitle={project.title}
            fee={project.fee}
            scheduleDates={(scheduleDates ?? []) as Array<{
              id: string; date: string; label: string | null;
              kind: string; sort_order: number;
            }>}
            defaultName={member?.name ?? ""}
            defaultPhone={member?.phone ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
