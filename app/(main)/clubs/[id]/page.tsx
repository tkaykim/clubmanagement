import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getMockClubById,
  getMockProjectsByClubId,
  getMockMembersCountByClubId,
} from "@/lib/mock-data";

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
    <div className="space-y-8">
      <div>
        <Link href="/clubs" className="text-sm text-muted-foreground hover:underline">← 동아리 목록</Link>
        <h1 className="mt-2 text-2xl font-bold">{club.name}</h1>
        <p className="mt-1 text-muted-foreground">{club.category} · 최대 {club.max_members}명</p>
        {club.is_recruiting && (
          <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-1 text-sm text-primary">모집 중</span>
        )}
      </div>

      {club.description && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground">소개</h2>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{club.description}</p>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">프로젝트</h2>
        <ul className="mt-2 space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={p.visibility === "public" ? `/events/${p.id}` : `/dashboard`}
                className="block rounded border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">{statusLabel[p.status] ?? p.status}</span>
                {p.starts_at && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {new Date(p.starts_at).toLocaleDateString("ko-KR")} ~ {p.ends_at ? new Date(p.ends_at).toLocaleDateString("ko-KR") : ""}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">회원</h2>
        <p className="mt-1 text-sm text-muted-foreground">승인 회원 {membersApproved}명</p>
      </section>
    </div>
  );
}
