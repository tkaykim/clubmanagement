import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PublicApplyForm } from "@/components/project/PublicApplyForm";
import { StatusBadge } from "@/components/ui/StatusBadge";

// 공개 지원 링크 (비인증 게스트 허용)
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PublicApplyPage({ params }: Props) {
  const { id: projectId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, title, status, type, fee, description, venue")
    .eq("id", projectId)
    .single();

  if (error || !project) notFound();

  const { data: scheduleDates } = await supabase
    .from("schedule_dates")
    .select("id, date, label, kind, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px",
      }}
    >
      {/* 브랜드 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/icon-192.png" alt="원샷크루" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border)", marginBottom: 10 }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--mf)" }}>
          ONESHOT CREW
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* 프로젝트 정보 */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div className="row gap-8" style={{ justifyContent: "center", marginBottom: 10 }}>
            <StatusBadge status={project.type} />
            <StatusBadge status={project.status} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>
            {project.title}
          </h1>
          {project.description && (
            <p style={{ fontSize: 13, color: "var(--mf)", lineHeight: 1.6 }}>
              {project.description.slice(0, 100)}
              {project.description.length > 100 && "…"}
            </p>
          )}
        </div>

        {project.status !== "recruiting" ? (
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <div style={{ color: "var(--mf)", fontSize: 14 }}>
              현재 지원을 받지 않는 프로젝트입니다.
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>지원서 작성</h2>
              <p className="sub" style={{ marginBottom: 20 }}>아래 항목을 작성해 주세요</p>
              <PublicApplyForm
                projectId={projectId}
                fee={project.fee ?? 0}
                scheduleDates={(scheduleDates ?? []) as Array<{
                  id: string; date: string; label: string | null;
                  kind: string; sort_order: number;
                }>}
              />
            </div>
          </div>
        )}

        <div
          className="mono text-xs muted"
          style={{ textAlign: "center", marginTop: 20 }}
        >
          ONESHOT CREW · 원샷크루
        </div>
      </div>
    </div>
  );
}
