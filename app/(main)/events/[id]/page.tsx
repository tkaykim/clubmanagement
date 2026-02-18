import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  free: "무료",
  paid: "유료",
  participation_fee: "참가비",
};

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

  const project = { name: projectData.name, description: projectData.description, poster_url: projectData.poster_url, project_type: projectData.project_type, starts_at: projectData.starts_at, ends_at: projectData.ends_at, club_id: projectData.club_id };
  const { data: club } = await supabase.from("clubs").select("name").eq("id", projectData.club_id).single();
  const clubName = club?.name ?? null;

  return (
    <div className="flex flex-col">
      <MobileHeader title="이벤트" backHref="/events" />
      <div className="flex-1">
        {/* 포스터 */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {project.poster_url ? (
            <img src={project.poster_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className="bg-white/90 text-foreground">{typeLabel[project.project_type] ?? project.project_type}</Badge>
            <h1 className="mt-2 text-xl font-bold text-white drop-shadow-md">{project.name}</h1>
          </div>
        </div>

        <div className="px-4 py-5">
          {clubName && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4" />
              주최: {clubName}
            </div>
          )}

          {project.starts_at && (
            <div className="mb-4 flex items-center gap-2 text-sm text-foreground">
              <Calendar className="size-4 text-muted-foreground" />
              {new Date(project.starts_at).toLocaleDateString("ko-KR")}
              {project.ends_at && project.ends_at !== project.starts_at
                ? ` ~ ${new Date(project.ends_at).toLocaleDateString("ko-KR")}`
                : ""}
            </div>
          )}

          {project.description && (
            <Card className="mb-6 border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">로그인 후 관람 신청을 이용할 수 있습니다.</p>
              <Button variant="outline" className="mt-3 rounded-xl" disabled>
                관람 신청 (준비 중)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
