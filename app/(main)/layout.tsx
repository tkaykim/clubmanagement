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

  // 사이드바 counts 계산
  let projectCount = 0;
  let unreadAnn = 0;
  let myPending = 0;

  try {
    const { count: pCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .in("status", ["recruiting", "in_progress"]);
    projectCount = pCount ?? 0;

    const { count: annCount } = await supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("pinned", true);
    unreadAnn = annCount ?? 0;

    if (me?.user_id) {
      const { count: pendingCount } = await supabase
        .from("project_applications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", me.user_id)
        .eq("status", "pending");
      myPending = pendingCount ?? 0;
    }
  } catch {
    // counts 실패는 무시
  }

  return (
    <ActiveGuard>
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
