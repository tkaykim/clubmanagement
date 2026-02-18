import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockProjectById, getMockClubById } from "@/lib/mock-data";

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

  let project: {
    name: string;
    description: string | null;
    poster_url: string | null;
    project_type: string;
    starts_at: string | null;
    ends_at: string | null;
    club_id: string;
  } | null = null;
  let clubName: string | null = null;

  if (supabase) {
    const { data: projectData, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("visibility", "public")
      .single();
    if (error || !projectData) {
      const mock = getMockProjectById(id);
      if (!mock || mock.visibility !== "public") notFound();
      project = { name: mock.name, description: mock.description, poster_url: mock.poster_url, project_type: mock.project_type, starts_at: mock.starts_at, ends_at: mock.ends_at, club_id: mock.club_id };
      const club = getMockClubById(mock.club_id);
      clubName = club?.name ?? null;
    } else {
      project = { name: projectData.name, description: projectData.description, poster_url: projectData.poster_url, project_type: projectData.project_type, starts_at: projectData.starts_at, ends_at: projectData.ends_at, club_id: projectData.club_id };
      const { data: club } = await supabase.from("clubs").select("name").eq("id", projectData.club_id).single();
      clubName = club?.name ?? null;
    }
  } else {
    const mock = getMockProjectById(id);
    if (!mock || mock.visibility !== "public") notFound();
    project = { name: mock.name, description: mock.description, poster_url: mock.poster_url, project_type: mock.project_type, starts_at: mock.starts_at, ends_at: mock.ends_at, club_id: mock.club_id };
    const club = getMockClubById(mock.club_id);
    clubName = club?.name ?? null;
  }

  if (!project) notFound();

  return (
    <div className="space-y-8">
      <Link href="/events" className="text-sm text-muted-foreground hover:underline">← 공개 이벤트</Link>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {project.poster_url ? (
          <img src={project.poster_url} alt="" className="h-64 w-full object-cover sm:h-80" />
        ) : (
          <div className="h-64 w-full bg-muted sm:h-80" />
        )}
        <div className="p-6">
          <span className="text-sm text-muted-foreground">{typeLabel[project.project_type] ?? project.project_type}</span>
          {clubName && (
            <p className="text-sm text-muted-foreground">주최: {clubName}</p>
          )}
          <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
          {project.starts_at && (
            <p className="mt-2 text-muted-foreground">
              {new Date(project.starts_at).toLocaleDateString("ko-KR")}
              {project.ends_at && project.ends_at !== project.starts_at
                ? ` ~ ${new Date(project.ends_at).toLocaleDateString("ko-KR")}`
                : ""}
            </p>
          )}
          {project.description && (
            <div className="mt-4 whitespace-pre-wrap text-foreground">{project.description}</div>
          )}
          <div className="mt-6 rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            체험 모드에서는 관람 신청 버튼이 비활성화됩니다. 로그인 후 실제 관람 신청을 이용할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
