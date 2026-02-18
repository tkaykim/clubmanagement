import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getMockClubById,
  getMockProjectsByClubId,
  getMockMembersCountByClubId,
} from "@/lib/mock-data";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users, FolderOpen } from "lucide-react";

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

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  let club: { name: string; description: string | null; category: string; max_members: number; is_recruiting: boolean } | null = null;
  let projects: { id: string; name: string; status: string; starts_at: string | null; ends_at: string | null; visibility: string }[] = [];
  let membersApproved = 0;

  if (supabase) {
    const { data: clubData, error } = await supabase.from("clubs").select("*").eq("id", id).single();
    if (error || !clubData) {
      const mock = getMockClubById(id);
      if (!mock) notFound();
      club = { name: mock.name, description: mock.description, category: mock.category, max_members: mock.max_members, is_recruiting: mock.is_recruiting };
      projects = getMockProjectsByClubId(id).map((p) => ({ id: p.id, name: p.name, status: p.status, starts_at: p.starts_at, ends_at: p.ends_at, visibility: p.visibility }));
      membersApproved = getMockMembersCountByClubId(id);
    } else {
      club = { name: clubData.name, description: clubData.description, category: clubData.category, max_members: clubData.max_members, is_recruiting: clubData.is_recruiting };
      const { data: members } = await supabase.from("members").select("id, role, status").eq("club_id", id);
      const { data: projectsData } = await supabase.from("projects").select("id, name, status, starts_at, ends_at, visibility").eq("club_id", id).order("starts_at", { ascending: false });
      projects = projectsData ?? [];
      membersApproved = (members ?? []).filter((m) => m.status === "approved").length;
    }
  } else {
    const mock = getMockClubById(id);
    if (!mock) notFound();
    club = { name: mock.name, description: mock.description, category: mock.category, max_members: mock.max_members, is_recruiting: mock.is_recruiting };
    projects = getMockProjectsByClubId(id).map((p) => ({ id: p.id, name: p.name, status: p.status, starts_at: p.starts_at, ends_at: p.ends_at, visibility: p.visibility }));
    membersApproved = getMockMembersCountByClubId(id);
  }

  if (!club) notFound();

  return (
    <div className="flex flex-col">
      <MobileHeader title={club.name} backHref="/clubs" />
      <div className="flex-1 px-4 py-4">
        {/* 상단 요약 */}
        <div className="mb-6 flex items-center gap-2">
          <Badge variant="secondary">{club.category}</Badge>
          {club.is_recruiting && <Badge>모집 중</Badge>}
          <span className="text-sm text-muted-foreground">최대 {club.max_members}명</span>
        </div>

        {club.description && (
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-muted-foreground">소개</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{club.description}</p>
            </CardContent>
          </Card>
        )}

        {/* 프로젝트 */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FolderOpen className="size-4" />
            프로젝트
          </h2>
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} href={p.visibility === "public" ? `/events/${p.id}` : "/dashboard"}>
                <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                  <CardContent className="flex flex-row items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {statusLabel[p.status] ?? p.status}
                        {p.starts_at && ` · ${new Date(p.starts_at).toLocaleDateString("ko-KR")}`}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* 회원 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-row items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">승인 회원</p>
              <p className="text-sm text-muted-foreground">{membersApproved}명</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
