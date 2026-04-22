import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MyPageClient } from "@/components/mypage/MyPageClient";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let member: {
    id: string; name: string; stage_name: string | null; email: string | null;
    phone: string | null; role: string; position: string | null; contract_type: string;
    joined_month: string | null;
  } | null = null;
  let applications: Array<{
    id: string; project_id: string; status: string; created_at: string;
    projects: { title: string; type: string; start_date: string | null };
  }> = [];
  let payouts: Array<{
    id: string; amount: number; status: string; scheduled_at: string | null;
    projects: { title: string };
  }> = [];
  let presets: Array<{
    id: string; name: string; description: string | null; config: Record<string, unknown>;
  }> = [];

  if (user) {
    try {
      const [memberRes, appRes, payRes, presetRes] = await Promise.all([
        supabase
          .from("crew_members")
          .select("id, name, stage_name, email, phone, role, position, contract_type, joined_month")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("project_applications")
          .select("id, project_id, status, created_at, projects:project_id(title, type, start_date)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payouts")
          .select("id, amount, status, scheduled_at, projects:project_id(title)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("availability_presets")
          .select("id, name, description, config")
          .eq("user_id", user.id),
      ]);

      member = memberRes.data as typeof member;
      applications = (appRes.data ?? []) as unknown as typeof applications;
      payouts = (payRes.data ?? []) as unknown as typeof payouts;
      presets = (presetRes.data ?? []) as typeof presets;
    } catch {
      // 빈 상태
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>마이페이지</h1>
          <div className="sub">내 지원 · 정산 · 프로필</div>
        </div>
      </div>

      <MyPageClient
        member={member}
        applications={applications}
        payouts={payouts}
        presets={presets}
      />
    </div>
  );
}
