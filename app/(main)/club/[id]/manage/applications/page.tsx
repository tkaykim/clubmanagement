import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClubManageApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
  if (!club) notFound();

  const { data: appRows } = await supabase.from("club_applications").select("id, user_id, status, applied_at").eq("club_id", id).eq("status", "pending");
  const userIds = [...new Set((appRows ?? []).map((a) => a.user_id))];
  const { data: users } = userIds.length > 0 ? await supabase.from("users").select("id, name, email").in("id", userIds) : { data: [] };
  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));

  const applications = (appRows ?? []).map((a) => {
    const u = userMap[a.user_id];
    return {
      id: a.id,
      applicant_name: u?.name ?? "회원",
      applicant_contact: u?.email ?? "",
      applied_at: a.applied_at,
      status: a.status,
    };
  });

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {club.name} 지원자 목록입니다. 승인·거절을 처리할 수 있습니다.
        </p>
        {applications.length === 0 ? (
          <Card className="border-0 border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <UserPlus className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">대기 중인 지원이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <Card key={app.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{app.applicant_name}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="size-3.5" /> {app.applicant_contact}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        지원일 {new Date(app.applied_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <Badge variant={app.status === "pending" ? "default" : "secondary"}>{app.status === "pending" ? "대기" : app.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="rounded-lg flex-1">승인</Button>
                    <Button size="sm" variant="outline" className="rounded-lg flex-1">거절</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
