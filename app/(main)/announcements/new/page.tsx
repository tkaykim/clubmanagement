import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NewAnnouncementForm } from "./NewAnnouncementForm";

export const dynamic = "force-dynamic";

export default async function NewAnnouncementPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("crew_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (me?.role as string | undefined) ?? null;
  const isAdmin = role === "admin" || role === "owner";
  if (!isAdmin) redirect("/announcements");

  // 프로젝트 선택지 — 취소된 것도 포함해 관리자 판단에 맡김
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status")
    .order("created_at", { ascending: false });

  const options = ((projects ?? []) as Array<{ id: string; title: string; status: string }>).map(
    p => ({ id: p.id, title: p.title, status: p.status })
  );

  return <NewAnnouncementForm projects={options} />;
}
