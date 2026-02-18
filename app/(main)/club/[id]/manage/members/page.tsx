import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockClubById, getMockMembersByClubId } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, User } from "lucide-react";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = { owner: "리더", admin: "관리자", member: "회원" };
const statusLabel: Record<string, string> = { active: "활성", inactive: "비활성", withdrawn: "탈퇴" };

export default async function ClubManageMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  let clubName = "";
  let members: { id: string; display_name: string; role: string; status: string; joined_at: string }[] = [];

  if (supabase) {
    const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
    if (!club) {
      const mock = getMockClubById(id);
      if (!mock) notFound();
      clubName = mock.name;
      members = getMockMembersByClubId(id);
    } else {
      clubName = club.name;
      const { data: m } = await supabase.from("members").select("id, user_id, role, status, joined_at").eq("club_id", id).order("joined_at", { ascending: false });
      members = (m ?? []).map((x) => ({
        id: x.id,
        display_name: "회원",
        role: x.role,
        status: x.status === "approved" ? "active" : "inactive",
        joined_at: x.joined_at,
      }));
    }
  } else {
    const mock = getMockClubById(id);
    if (!mock) notFound();
    clubName = mock.name;
    members = getMockMembersByClubId(id);
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {clubName} 회원 목록입니다. 활성·비활성·탈퇴 상태를 확인할 수 있습니다.
        </p>
        {members.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <User className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">등록된 회원이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id} className="border-0 shadow-sm">
                <CardContent className="flex flex-row items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{m.display_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{roleLabel[m.role] ?? m.role}</Badge>
                      <Badge variant="secondary" className="text-xs">{statusLabel[m.status] ?? m.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      가입일 {new Date(m.joined_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
