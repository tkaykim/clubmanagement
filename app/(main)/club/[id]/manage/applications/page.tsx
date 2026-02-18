import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMockClubById, getMockApplicationsByClubId } from "@/lib/mock-data";
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

  let clubName = "";
  let applications: { id: string; applicant_name: string; applicant_contact: string; applied_at: string; status: string }[] = [];

  if (supabase) {
    const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
    if (!club) {
      const mock = getMockClubById(id);
      if (!mock) notFound();
      clubName = mock.name;
      applications = getMockApplicationsByClubId(id);
    } else {
      clubName = club.name;
      // club_applications 테이블이 없을 수 있음
      applications = getMockApplicationsByClubId(id);
    }
  } else {
    const mock = getMockClubById(id);
    if (!mock) notFound();
    clubName = mock.name;
    applications = getMockApplicationsByClubId(id);
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          {clubName} 지원자 목록입니다. 승인·거절을 처리할 수 있습니다.
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
