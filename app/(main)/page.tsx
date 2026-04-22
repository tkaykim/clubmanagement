import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtKRW, fmtDateKo } from "@/lib/utils";
import { Folder, Calendar, Megaphone, Pin, Sparkles, Clock, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  // 현재 유저의 크루 멤버 레코드에서 이름 / 권한 가져오기
  let displayName = "";
  let currentRole: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("crew_members")
      .select("name, stage_name, role")
      .eq("user_id", user.id)
      .maybeSingle();
    displayName =
      (me?.stage_name as string | undefined) ||
      (me?.name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "";
    currentRole = (me?.role as string | undefined) ?? null;
  }
  const isAdmin = currentRole === "owner" || currentRole === "admin";

  // 관리자에게만: 승인 대기 멤버 수
  let pendingMemberCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("crew_members")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false);
    pendingMemberCount = count ?? 0;
  }

  let projects: Array<{
    id: string; title: string; status: string; type: string;
    poster_url: string | null; start_date: string | null;
    fee: number; venue: string | null;
  }> = [];
  let announcements: Array<{
    id: string; title: string; body: string; pinned: boolean;
    created_at: string; scope: string;
  }> = [];
  let myApplications: Array<{ id: string; project_id: string; status: string }> = [];
  let myPayouts: Array<{ id: string; amount: number; status: string }> = [];

  try {
    const [projRes, annRes] = await Promise.all([
      supabase
        .from("projects_with_range")
        .select("id, title, status, type, poster_url, start_date, fee, venue")
        .in("status", ["recruiting", "in_progress", "completed"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("announcements")
        .select("id, title, body, pinned, created_at, scope")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    projects = (projRes.data ?? []) as typeof projects;
    announcements = (annRes.data ?? []) as typeof announcements;

    if (user) {
      const [appRes, payRes] = await Promise.all([
        supabase
          .from("project_applications")
          .select("id, project_id, status")
          .eq("user_id", user.id),
        supabase
          .from("payouts")
          .select("id, amount, status")
          .eq("user_id", user.id)
          .neq("status", "paid"),
      ]);
      myApplications = (appRes.data ?? []) as typeof myApplications;
      myPayouts = (payRes.data ?? []) as typeof myPayouts;
    }
  } catch {
    // 데이터 없이도 페이지 렌더
  }

  const activeProjects = projects.filter(p => p.status === "recruiting" || p.status === "in_progress");
  const pastProjects = projects.filter(p => p.status === "completed").slice(0, 5);
  const pendingApps = myApplications.filter(a => a.status === "pending");
  const approvedApps = myApplications.filter(a => a.status === "approved");
  const pinnedAnn = announcements.filter(a => a.pinned);
  const unpaidAmount = myPayouts.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <div className="page">
      {/* 페이지 헤더 */}
      <div className="page-head">
        <div>
          <h1>
            <span className="serif-tag">Welcome,</span>
            {displayName || "홈"}
          </h1>
          <div className="sub">오늘의 현황을 확인하세요</div>
        </div>
        <div className="row gap-8">
          <Link href="/calendar" className="btn">
            <Calendar size={14} strokeWidth={2} />
            캘린더
          </Link>
          <Link href="/projects" className="btn primary">
            <Folder size={14} strokeWidth={2} />
            프로젝트 전체보기
          </Link>
        </div>
      </div>

      {/* 관리자 알림: 승인 대기 멤버 */}
      {isAdmin && pendingMemberCount > 0 && (
        <Link
          href="/manage/members?tab=pending"
          className="banner mb-16"
          style={{
            textDecoration: "none",
            borderColor: "var(--warn, #b8860b)",
            background: "color-mix(in srgb, var(--warn, #b8860b) 8%, transparent)",
          }}
        >
          <UserPlus size={16} strokeWidth={2} />
          <div className="flex-1">
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              신규 회원 승인 대기 {pendingMemberCount}명
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>
              멤버 관리 페이지에서 승인 여부를 결정하세요
            </div>
          </div>
        </Link>
      )}

      {/* 통계 카드 */}
      <div className="os-grid grid-4 mb-24">
        <Link href="/mypage?tab=applications" className="card stat" style={{ cursor: "pointer", textDecoration: "none" }}>
          <div className="lab">지원 대기</div>
          <div className="num tabnum">{pendingApps.length}</div>
          <div className="delta">응답 대기중</div>
        </Link>
        <Link href="/calendar" className="card stat" style={{ cursor: "pointer", textDecoration: "none" }}>
          <div className="lab">다가오는 확정</div>
          <div className="num tabnum">{approvedApps.length}</div>
          <div className="delta">확정 프로젝트</div>
        </Link>
        <Link href="/announcements" className="card stat" style={{ cursor: "pointer", textDecoration: "none" }}>
          <div className="lab">고정 공지</div>
          <div className="num tabnum">{pinnedAnn.length}</div>
          <div className="delta">고정 공지 {pinnedAnn.length}건</div>
        </Link>
        <Link href="/mypage?tab=payouts" className="card stat" style={{ cursor: "pointer", textDecoration: "none" }}>
          <div className="lab">미정산 금액</div>
          <div className="num tabnum" style={{ fontSize: unpaidAmount > 0 ? 26 : 36 }}>
            {unpaidAmount > 0 ? fmtKRW(unpaidAmount) : "0"}
          </div>
          <div className="delta">정산 대기 {myPayouts.length}건</div>
        </Link>
      </div>

      {/* 고정 공지 */}
      {pinnedAnn.length > 0 && (
        <div className="mb-24">
          <div className="row mb-12" style={{ justifyContent: "space-between" }}>
            <div className="row gap-8">
              <Pin size={14} strokeWidth={2} />
              <b className="text-sm">고정 공지</b>
            </div>
            <Link href="/announcements" className="btn ghost sm">
              전체보기
            </Link>
          </div>
          <div className="os-grid grid-2">
            {pinnedAnn.map(a => (
              <Link
                key={a.id}
                href={`/announcements/${a.id}`}
                className="banner"
                style={{ textDecoration: "none" }}
              >
                <Megaphone size={16} strokeWidth={2} />
                <div className="flex-1">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.7, fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {new Date(a.created_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 진행 중 프로젝트 */}
      <div className="mb-24">
        <div className="row mb-12" style={{ justifyContent: "space-between" }}>
          <div className="row gap-8">
            <Sparkles size={14} strokeWidth={2} />
            <b className="text-sm">진행 중 프로젝트</b>
          </div>
          <Link href="/projects" className="btn ghost sm">
            전체보기
          </Link>
        </div>

        {activeProjects.length === 0 ? (
          <div className="card">
            <div className="empty">
              <Folder className="ico" strokeWidth={1.5} />
              <div>진행 중인 프로젝트가 없어요</div>
            </div>
          </div>
        ) : (
          <div className="os-grid grid-2">
            {activeProjects.slice(0, 4).map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="card flush"
                style={{ cursor: "pointer", textDecoration: "none", transition: "border-color 150ms" }}
              >
                {p.poster_url ? (
                  <img
                    src={p.poster_url}
                    alt={p.title}
                    style={{ width: "100%", aspectRatio: "21/9", objectFit: "cover", borderBottom: "1px solid var(--border)" }}
                  />
                ) : (
                  <div className="poster" style={{ aspectRatio: "21/10", borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)" }}>
                    NO POSTER
                  </div>
                )}
                <div style={{ padding: 16 }}>
                  <div className="row gap-6 mb-8">
                    <StatusBadge status={p.status} />
                    <StatusBadge status={p.type} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8 }}>
                    {p.title}
                  </div>
                  <dl className="kv" style={{ gap: "4px 12px" }}>
                    {p.start_date && (
                      <>
                        <dt>DATE</dt>
                        <dd className="mono text-xs">{p.start_date}</dd>
                      </>
                    )}
                    {p.venue && (
                      <>
                        <dt>VENUE</dt>
                        <dd className="text-xs">{p.venue}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 지난 프로젝트 */}
      {pastProjects.length > 0 && (
        <div>
          <div className="row mb-12">
            <Clock size={14} strokeWidth={2} />
            <b className="text-sm">지난 프로젝트</b>
          </div>
          <div className="card flush">
            {pastProjects.map((p, i) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                style={{
                  padding: "14px 18px",
                  borderBottom: i < pastProjects.length - 1 ? "1px solid var(--border)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: 0.8,
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="mono text-xs muted">{p.start_date ?? "—"}</div>
                <div className="flex-1 text-sm" style={{ fontWeight: 500 }}>{p.title}</div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
