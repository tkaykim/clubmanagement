import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NewProjectForm, type InitialProjectData } from "@/components/project/NewProjectForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, type, status, visibility, description, pay_type, fee, venue, address, recruitment_start_at, recruitment_end_at, max_participants"
    )
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const { data: rawDates } = await supabase
    .from("schedule_dates")
    .select("date, kind, label, sort_order")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const schedule_dates = ((rawDates ?? []) as Array<{
    date: string;
    kind: string;
    label: string | null;
  }>).map((d) => ({ date: d.date, kind: d.kind, label: d.label }));

  const initial: InitialProjectData = {
    ...(project as Omit<InitialProjectData, "schedule_dates">),
    schedule_dates,
  };

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href={`/manage/projects/${id}?tab=applications`} className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          프로젝트로 돌아가기
        </Link>
      </div>
      <div className="page-head">
        <div>
          <h1>프로젝트 수정</h1>
          <div className="sub">{initial.title}</div>
        </div>
      </div>
      <NewProjectForm mode="edit" initialProject={initial} />
    </div>
  );
}
