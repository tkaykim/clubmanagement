import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { RecruitmentFormBuilder } from "@/components/project/RecruitmentFormBuilder";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { ProjectRecruitmentForm, ProjectRecruitmentQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectRecruitmentFormPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: clubId, projectId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name, club_id")
    .eq("id", projectId)
    .eq("club_id", clubId)
    .single();
  if (projectErr || !project) notFound();

  const { data: form } = await supabase
    .from("project_recruitment_forms")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  const { data: questions } = await supabase
    .from("project_recruitment_questions")
    .select("*")
    .eq("form_id", form?.id ?? "")
    .order("sort_order");

  const formData: ProjectRecruitmentForm | null = form
    ? {
        id: form.id,
        project_id: form.project_id,
        title: form.title,
        description: form.description,
        poster_url: form.poster_url,
        created_at: form.created_at,
        updated_at: form.updated_at,
      }
    : null;
  const questionsData: ProjectRecruitmentQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    form_id: q.form_id,
    sort_order: q.sort_order,
    type: q.type,
    label: q.label,
    required: q.required,
    options: q.options,
    created_at: q.created_at,
  }));

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Link href={`/club/${clubId}/manage/projects`}>
          <Button variant="ghost" size="icon" className="size-9 rounded-full">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">{project.name} · 모집 폼</h1>
      </div>
      <div className="px-4 py-4">
        <RecruitmentFormBuilder
          key={form?.updated_at ?? form?.id ?? projectId}
          clubId={clubId}
          projectId={projectId}
          initialForm={formData}
          initialQuestions={questionsData}
        />
      </div>
    </div>
  );
}
