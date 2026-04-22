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

  // crew_member + counts 5개 쿼리 전부 병렬 실행 — 모바일 탭 전환 레이턴시 최소화
  const [memberRes, projResult, annResult, pendingResult] = await Promise.all([
    supabase
      .from("crew_members")
      .select("id, user_id, name, avatar_url, role, is_active")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .in("status", ["recruiting", "in_progress"]),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("pinned", true),
    supabase
      .from("project_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),
  ]);

  const me = memberRes.data as CrewMember | null;
  const isAdmin = me?.role === "admin" || me?.role === "owner";
  // admin/owner 는 is_active 플래그와 무관하게 활성 처리 (관리자 잠금 방지)
  const initialStatus: "active" | "inactive" = isAdmin || me?.is_active ? "active" : "inactive";

  const projectCount = projResult.count ?? 0;
  const unreadAnn = annResult.count ?? 0;
  const myPending = pendingResult.count ?? 0;

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
