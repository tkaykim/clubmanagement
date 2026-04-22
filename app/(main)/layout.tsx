import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ActiveGuard } from "@/components/auth/ActiveGuard";
import { AppShell } from "@/components/layout/AppShell";
import type { CrewMember } from "@/lib/types";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();

  // 현재 유저 확인
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // crew_member 조회
  const { data: member } = await supabase
    .from("crew_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const me = member as CrewMember | null;
  const isAdmin = me?.role === "admin" || me?.role === "owner";

  // 사이드바 counts — 병렬 조회 (모바일 탭 전환 레이턴시 최소화)
  const [projResult, annResult, pendingResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .in("status", ["recruiting", "in_progress"]),
    supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("pinned", true),
    me?.user_id
      ? supabase
          .from("project_applications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", me.user_id)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 as number | null }),
  ]);

  const projectCount = projResult.count ?? 0;
  const unreadAnn = annResult.count ?? 0;
  const myPending = pendingResult.count ?? 0;

  const initialStatus: "active" | "inactive" = me?.is_active ? "active" : "inactive";

  return (
    <ActiveGuard initialStatus={initialStatus}>
      <AppShell
        me={me}
        isAdmin={isAdmin}
        counts={{ projects: projectCount, unreadAnn, myPending }}
      >
        {children}
      </AppShell>
    </ActiveGuard>
  );
}
