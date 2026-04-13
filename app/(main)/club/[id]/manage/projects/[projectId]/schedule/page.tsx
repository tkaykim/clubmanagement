import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { ScheduleAggregationView } from "@/components/project/ScheduleAggregationView";

export const dynamic = "force-dynamic";

export default async function ProjectScheduleManagePage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: clubId, projectId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, club_id")
    .eq("id", projectId)
    .eq("club_id", clubId)
    .single();
  if (!project) notFound();

  return (
    <div className="flex flex-col">
      <MobileHeader
        title="일정 관리"
        backHref={`/club/${clubId}/manage/projects`}
      />
      <div className="px-4 py-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">
            참여자들의 가능 일정을 확인하고 관리하세요.
          </p>
        </div>
        <ScheduleAggregationView projectId={projectId} />
      </div>
    </div>
  );
}
