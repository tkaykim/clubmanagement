import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Users, FolderOpen, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient();

  let clubCount = 0;
  let projectCount = 0;
  let publicEventCount = 0;

  if (supabase) {
    const [c, p, pub] = await Promise.all([
      supabase.from("clubs").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("visibility", "public"),
    ]);
    clubCount = c.count ?? 0;
    projectCount = p.count ?? 0;
    publicEventCount = pub.count ?? 0;
  }

  const stats = [
    { label: "동아리", value: clubCount, href: "/admin/clubs", icon: Users },
    { label: "전체 프로젝트", value: projectCount, href: "/admin/projects", icon: FolderOpen },
    { label: "공개 이벤트", value: publicEventCount, href: "/events", icon: Globe },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-4 py-5">
        <p className="mb-5 text-sm text-muted-foreground">
          플랫폼 전체 현황을 확인하고 동아리·프로젝트를 관리합니다.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map(({ label, value, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-0.5 text-xs font-medium text-primary">
                    보기 <ChevronRight className="size-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">빠른 메뉴</h2>
        <div className="space-y-2">
          <Link href="/admin/clubs">
            <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
              <CardContent className="flex flex-row items-center gap-3 p-4">
                <Users className="size-5 text-muted-foreground" />
                <span className="font-medium text-foreground">동아리 목록 관리</span>
                <ChevronRight className="ml-auto size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/projects">
            <Card className="border-0 shadow-sm transition-shadow active:shadow-md">
              <CardContent className="flex flex-row items-center gap-3 p-4">
                <FolderOpen className="size-5 text-muted-foreground" />
                <span className="font-medium text-foreground">프로젝트 목록 관리</span>
                <ChevronRight className="ml-auto size-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
