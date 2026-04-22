import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Calendar, Banknote, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ApplicantList, type Applicant } from "./ApplicantList";
import { fmtPay, memberKindOf } from "@/lib/utils";

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

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR");
}

export default async function ApplicantsPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: projectData } = await supabase
    .from("projects_with_range")
    .select("id, title, start_date, end_date, pay_type, fee, status")
    .eq("id", projectId)
    .single();

  if (!projectData) {
    return (
      <div className="page">
        <div className="empty">프로젝트를 찾을 수 없습니다</div>
      </div>
    );
  }

  const { data: appData } = await supabase
    .from("project_applications")
    .select("id, user_id, status, created_at, guest_name, guest_email, guest_phone")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const rows = (appData ?? []) as ApplicationRow[];

  // 멤버 지원자의 실제 이름/연락처/역할은 crew_members 에서 resolve
  const userIds = Array.from(new Set(rows.map(r => r.user_id).filter((v): v is string => !!v)));
  type MemberInfo = {
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    contract_type: string;
  };
  const memberMap = new Map<string, MemberInfo>();
  if (userIds.length > 0) {
    const { data: members } = await supabase
      .from("crew_members")
      .select("user_id, name, stage_name, email, phone, role, contract_type")
      .in("user_id", userIds);
    for (const m of (members ?? []) as Array<{ user_id: string; name: string; stage_name: string | null; email: string | null; phone: string | null; role: string; contract_type: string }>) {
      memberMap.set(m.user_id, {
        name: m.stage_name ?? m.name,
        email: m.email,
        phone: m.phone,
        role: m.role,
        contract_type: m.contract_type,
      });
    }
  }

  const applicants: Applicant[] = rows.map(a => {
    const m = a.user_id ? memberMap.get(a.user_id) : null;
    return {
      id: a.id,
      name: a.guest_name ?? m?.name ?? (a.user_id ? "멤버" : "이름 없음"),
      email: a.guest_email ?? m?.email ?? null,
      phone: a.guest_phone ?? m?.phone ?? null,
      status: a.status,
      created_at: a.created_at,
      // 멤버 매칭 실패 시에도 외부 게스트로 취급 (defensive)
      kind: memberKindOf(m?.role, m?.contract_type, !!(a.user_id && m)),
    };
  });

  const confirmed = applicants.filter(a => a.status === "approved").length;
  const pending = applicants.filter(a => a.status === "pending").length;
  const rejected = applicants.filter(a => a.status === "rejected").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link href={`/manage/projects/${projectId}`} className="row gap-6" style={{ color: "var(--mf)", fontSize: 13, textDecoration: "none", marginBottom: 6, display: "inline-flex" }}>
            <ArrowLeft size={14} strokeWidth={2} />
            돌아가기
          </Link>
          <h1>{projectData.title} · 지원자</h1>
          <div className="sub">
            {projectData.start_date && (
              <span><Calendar size={12} strokeWidth={2} style={{ display: "inline", marginRight: 4 }} />{formatDate(projectData.start_date)}</span>
            )}
            <span style={{ marginLeft: 12 }}>
              <Banknote size={12} strokeWidth={2} style={{ display: "inline", marginRight: 4 }} />
              {fmtPay((projectData as { pay_type?: string | null }).pay_type, projectData.fee as number)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
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
          <div className="lab">거절</div>
          <div className="num tabnum" style={{ fontSize: 24 }}>{rejected}</div>
        </div>
      </div>

      <ApplicantList applicants={applicants} projectId={projectId} />
    </div>
  );
}
