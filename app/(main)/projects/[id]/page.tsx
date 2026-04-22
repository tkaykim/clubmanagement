import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtKRW } from "@/lib/utils";
import { ChevronLeft, Calendar, MapPin, Users, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  // 지원자 수 조회
  const { count: applicantCount } = await supabase
    .from("project_applications")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: confirmedCount } = await supabase
    .from("project_applications")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "approved");

  // 현재 유저의 지원 여부
  const { data: { user } } = await supabase.auth.getUser();
  let myApp: { status: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("project_applications")
      .select("status")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    myApp = data;
  }

  const isRecruiting = project.status === "recruiting";
  const canApply = isRecruiting && !myApp;

  return (
    <div className="page">
      {/* 뒤로 가기 */}
      <div className="row mb-12">
        <Link href="/projects" className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          프로젝트
        </Link>
        <span className="mono text-xs muted" style={{ letterSpacing: "0.08em" }}>PROJECT</span>
      </div>

      {/* 헤더 */}
      <div className="page-head">
        <div>
          <div className="row gap-8 mb-8">
            <StatusBadge status={project.status} />
            <StatusBadge status={project.type} />
            {project.fee > 0 && (
              <span className="badge outline">₩ {fmtKRW(project.fee)}</span>
            )}
          </div>
          <h1 style={{ marginBottom: 6 }}>{project.title}</h1>
          {project.description && (
            <p className="sub" style={{ maxWidth: 600 }}>
              {project.description.length > 120
                ? project.description.slice(0, 120) + "…"
                : project.description}
            </p>
          )}
        </div>
        {canApply && (
          <Link href={`/projects/${projectId}/apply`} className="btn primary lg">
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 16 }}>✦</span>
            지원하기
          </Link>
        )}
        {myApp && (
          <div className="row gap-8">
            <span className="mono text-xs muted">내 지원 상태</span>
            <StatusBadge status={myApp.status} />
          </div>
        )}
      </div>

      <div className="os-grid grid-2">
        {/* 왼쪽 컬럼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 일시/장소 */}
          <div className="card">
            <div className="card-head">
              <h3>일시 / 장소</h3>
            </div>
            <div style={{ padding: 18 }}>
              <dl className="kv">
                <dt>일시</dt>
                <dd>
                  {project.schedule_undecided
                    ? "미정"
                    : project.start_date
                      ? project.start_date + (project.end_date && project.end_date !== project.start_date ? ` ~ ${project.end_date}` : "")
                      : "미정"}
                </dd>
                {project.venue && (
                  <>
                    <dt>장소</dt>
                    <dd>{project.venue}</dd>
                  </>
                )}
                {project.address && (
                  <>
                    <dt>주소</dt>
                    <dd>{project.address}</dd>
                  </>
                )}
                {project.fee !== 0 && (
                  <>
                    <dt>출연료</dt>
                    <dd className="tabnum" style={{ fontWeight: 600 }}>
                      {project.fee > 0 ? `₩ ${fmtKRW(project.fee)}` : `참가비 ₩ ${fmtKRW(Math.abs(project.fee))}`}
                    </dd>
                  </>
                )}
                {project.recruitment_end_at && (
                  <>
                    <dt>모집마감</dt>
                    <dd className="mono text-xs">{project.recruitment_end_at}</dd>
                  </>
                )}
                {project.max_participants && (
                  <>
                    <dt>정원</dt>
                    <dd>{project.max_participants}명</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* 지원 현황 */}
          <div className="card">
            <div className="card-head">
              <h3>지원 현황</h3>
            </div>
            <div style={{ padding: 18 }}>
              <div className="os-grid grid-2" style={{ gap: 12 }}>
                <div className="stat">
                  <div className="lab">총 지원자</div>
                  <div className="num tabnum">{applicantCount ?? 0}</div>
                </div>
                <div className="stat">
                  <div className="lab">확정</div>
                  <div className="num tabnum">{confirmedCount ?? 0}</div>
                </div>
              </div>
              {canApply && (
                <div style={{ marginTop: 16 }}>
                  <Link href={`/projects/${projectId}/apply`} className="btn primary" style={{ width: "100%", justifyContent: "center" }}>
                    지원하기
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 컬럼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 포스터 */}
          {project.poster_url ? (
            <img
              src={project.poster_url}
              alt={project.title}
              style={{ width: "100%", aspectRatio: "21/9", objectFit: "cover", borderRadius: "var(--radius-os)", border: "1px solid var(--border)" }}
            />
          ) : (
            <div className="poster" style={{ width: "100%" }}>NO POSTER</div>
          )}

          {/* 상세 설명 */}
          {project.description && project.description.length > 120 && (
            <div className="card">
              <div className="card-head">
                <h3>소개</h3>
              </div>
              <div style={{ padding: 18 }}>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg-soft)", whiteSpace: "pre-wrap" }}>
                  {project.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
