import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ActiveGuard } from "@/components/auth/ActiveGuard";
import { SessionRefresher } from "@/components/auth/SessionRefresher";
import { AppShell } from "@/components/layout/AppShell";
import type { CrewMember } from "@/lib/types";

// 인증/권한 1차 판정만 수행. 사이드바/네비 카운트는 클라이언트에서 /api/me/counts로 fetch.
// (이전: 매 nav마다 6개 Supabase 쿼리 실행 → PWA 탭 전환 체감 지연의 주범)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberData } = await supabase
    .from("crew_members")
    .select("id, user_id, name, stage_name, role, contract_type, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const me = memberData as CrewMember | null;
  const isAdmin = me?.role === "admin" || me?.role === "owner";
  const initialStatus: "active" | "inactive" =
    isAdmin || me?.is_active ? "active" : "inactive";

  // 프로젝트 관리자(읽기전용)로 지정된 멤버인지 — '내 담당 프로젝트' 메뉴 노출용.
  // 운영진은 /manage 를 쓰므로 비운영진에게만 확인.
  let isProjectManager = false;
  if (!isAdmin) {
    const { count } = await supabase
      .from("project_managers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    isProjectManager = (count ?? 0) > 0;
  }

  return (
    <ActiveGuard initialStatus={initialStatus}>
      <SessionRefresher />
      <AppShell me={me} isAdmin={isAdmin} isProjectManager={isProjectManager}>
        {children}
      </AppShell>
    </ActiveGuard>
  );
}
