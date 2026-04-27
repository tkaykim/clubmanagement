import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PushSendForm, type MemberOption, type ProjectOption } from "@/components/manage/PushSendForm";

export const dynamic = "force-dynamic";

export default async function PushSendPage() {
  const supabase = createServerSupabaseClient();

  const [{ data: members }, { data: projects }, { data: subs }] = await Promise.all([
    supabase
      .from("crew_members")
      .select("id, user_id, name, stage_name, role")
      .not("user_id", "is", null)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id, title, status")
      .in("status", ["recruiting", "selecting", "in_progress"])
      .order("created_at", { ascending: false }),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  const memberOptions: MemberOption[] = ((members ?? []) as Array<{
    id: string;
    user_id: string | null;
    name: string;
    stage_name: string | null;
    role: string;
  }>)
    .filter((m): m is MemberOption & { user_id: string } => !!m.user_id)
    .map((m) => ({
      id: m.id,
      user_id: m.user_id,
      name: m.name,
      stage_name: m.stage_name,
      role: m.role,
    }));

  const projectOptions: ProjectOption[] = ((projects ?? []) as Array<{
    id: string;
    title: string;
    status: string;
  }>).map((p) => ({ id: p.id, title: p.title, status: p.status }));

  const subscribedUserIds = new Set(
    ((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>푸시 알림</h1>
          <div className="sub">
            구독 멤버 {subscribedUserIds.size}명 · 전체 {memberOptions.length}명
          </div>
        </div>
      </div>

      <PushSendForm
        members={memberOptions}
        projects={projectOptions}
        subscribedUserIds={Array.from(subscribedUserIds)}
      />
    </div>
  );
}
