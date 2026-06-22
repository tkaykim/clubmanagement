import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProjectAccess } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { memberKindOf } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type ApplicationRow = {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
};

function formatDateTime(d: string): string {
  const date = new Date(d);
  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// 프로젝트 관리자(읽기전용) 지원자현황.
// 내부 심사정보(점수/메모/지원동기/지원서 답변)는 조회하지 않는다.
export default async function ManagerApplicantsPage({ params }: Props) {
  const { id: projectId } = await params;

  const access = await getProjectAccess(projectId);
  if (!access) notFound();

  const supabase = createServerSupabaseClient();

  const { data: projectData } = await supabase
    .from("projects_with_range")
    .select("id, title, start_date, status")
    .eq("id", projectId)
    .single();
  if (!projectData) notFound();

  const { data: appData } = await supabase
    .from("project_applications")
    .select("id, user_id, status, created_at, guest_name, guest_email, guest_phone")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const rows = (appData ?? []) as ApplicationRow[];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)));
  type MemberInfo = { name: string; email: string | null; phone: string | null; role: string; contract_type: string };
  const memberMap = new Map<string, MemberInfo>();
  if (userIds.length > 0) {
    const { data: members } = await supabase
      .from("crew_members")
      .select("user_id, name, stage_name, email, phone, role, contract_type")
      .in("user_id", userIds);
    for (const m of (members ?? []) as Array<{
      user_id: string;
      name: string;
      stage_name: string | null;
      email: string | null;
      phone: string | null;
      role: string;
      contract_type: string;
    }>) {
      memberMap.set(m.user_id, {
        name: m.stage_name ?? m.name,
        email: m.email,
        phone: m.phone,
        role: m.role,
        contract_type: m.contract_type,
      });
    }
  }

  const applicants = rows.map((a) => {
    const m = a.user_id ? memberMap.get(a.user_id) : null;
    return {
      id: a.id,
      name: a.guest_name ?? m?.name ?? (a.user_id ? "멤버" : "이름 없음"),
      email: a.guest_email ?? m?.email ?? null,
      phone: a.guest_phone ?? m?.phone ?? null,
      status: a.status,
      created_at: a.created_at,
      kind: memberKindOf(m?.role, m?.contract_type, !!(a.user_id && m)),
    };
  });

  const confirmed = applicants.filter((a) => a.status === "approved").length;
  const pending = applicants.filter((a) => a.status === "pending").length;
  const rejected = applicants.filter((a) => a.status === "rejected").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link
            href="/my-projects"
            className="row gap-6"
            style={{ color: "var(--mf)", fontSize: 13, textDecoration: "none", marginBottom: 6, display: "inline-flex" }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            내 담당 프로젝트
          </Link>
          <h1>{projectData.title} · 지원자현황</h1>
          <div className="sub">읽기전용 · 상태 변경/수정은 운영진만 가능합니다</div>
        </div>
      </div>

      <div className="os-grid grid-4 mb-24">
        <div className="card stat">
          <div className="lab">전체</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{applicants.length}</div>
        </div>
        <div className="card stat">
          <div className="lab">확정</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{confirmed}</div>
        </div>
        <div className="card stat">
          <div className="lab">대기</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{pending}</div>
        </div>
        <div className="card stat">
          <div className="lab">다음 기회에</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{rejected}</div>
        </div>
      </div>

      {applicants.length === 0 ? (
        <div className="card">
          <div className="empty">아직 지원자가 없습니다</div>
        </div>
      ) : (
        <div className="card flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>이름</th>
                <th>연락처</th>
                <th>상태</th>
                <th>지원일</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a, idx) => (
                <tr key={a.id}>
                  <td data-label="#" className="mono text-xs muted">{idx + 1}</td>
                  <td data-label="이름" style={{ fontWeight: 600 }}>
                    <div className="row gap-6" style={{ flexWrap: "wrap" }}>
                      <span>{a.name}</span>
                      <StatusBadge status={a.kind} />
                    </div>
                  </td>
                  <td data-label="연락처">
                    {a.email && (
                      <div className="row gap-4" style={{ fontSize: 12, color: "var(--mf)" }}>
                        <Mail size={11} strokeWidth={2} />
                        {a.email}
                      </div>
                    )}
                    {a.phone && (
                      <div className="row gap-4" style={{ fontSize: 12, color: "var(--mf)" }}>
                        <Phone size={11} strokeWidth={2} />
                        {a.phone}
                      </div>
                    )}
                    {!a.email && !a.phone && <span style={{ color: "var(--mf-2)" }}>—</span>}
                  </td>
                  <td data-label="상태">
                    <StatusBadge status={a.status} />
                  </td>
                  <td data-label="지원일" className="mono text-xs muted">
                    <span className="row gap-4" style={{ alignItems: "center" }}>
                      <Calendar size={11} strokeWidth={2} />
                      {formatDateTime(a.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
