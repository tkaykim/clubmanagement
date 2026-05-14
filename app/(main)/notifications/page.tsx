import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NotificationsClient, type NotificationRow } from "@/components/notifications/NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("user_notifications")
    .select("id, title, body, url, tag, target_type, target_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="page">
      <div className="page-head">
        <h1>알림</h1>
        <div className="sub">최근 50건</div>
      </div>
      <NotificationsClient initialItems={(data ?? []) as NotificationRow[]} />
    </div>
  );
}
