import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Pin, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const supabase = createServerSupabaseClient();

  // 현재 유저가 admin인지 확인
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: member } = await supabase
      .from("crew_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = member?.role === "admin" || member?.role === "owner";
  }

  let announcements: Array<{
    id: string; title: string; body: string; pinned: boolean;
    scope: string; created_at: string; project_id: string | null;
  }> = [];

  try {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, pinned, scope, created_at, project_id")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    announcements = (data ?? []) as typeof announcements;
  } catch {
    // empty
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>공지</h1>
          <div className="sub">팀 · 프로젝트 공지</div>
        </div>
        {isAdmin && (
          <Link href="/announcements/new" className="btn primary">
            <Megaphone size={14} strokeWidth={2} />
            공지 작성
          </Link>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Megaphone className="ico" strokeWidth={1.5} />
            <div>새 공지가 없어요</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {announcements.map(a => (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="card"
              style={{ textDecoration: "none", cursor: "pointer" }}
            >
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div className="row gap-8">
                  {a.pinned && <Pin size={14} strokeWidth={2} style={{ color: "var(--warn)" }} />}
                  <b style={{ fontSize: 14 }}>{a.title}</b>
                </div>
                <div className="row gap-6">
                  <span className="badge">{a.scope === "team" ? "팀" : "프로젝트"}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--mf)", lineHeight: 1.6, margin: 0 }}>
                {a.body.length > 100 ? a.body.slice(0, 100) + "…" : a.body}
              </p>
              <div className="mono text-xs muted" style={{ marginTop: 8 }}>
                {new Date(a.created_at).toLocaleDateString("ko-KR")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
