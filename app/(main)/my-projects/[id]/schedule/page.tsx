import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProjectAccess } from "@/lib/auth";
import { ScheduleAggregationView } from "@/components/project/ScheduleAggregationView";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// 프로젝트 관리자(읽기전용) 일정 뷰.
export default async function ManagerSchedulePage({ params }: Props) {
  const { id: projectId } = await params;

  const access = await getProjectAccess(projectId);
  if (!access) notFound();

  const supabase = createServerSupabaseClient();
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .single();
  if (!projectData) notFound();

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
          <h1>{projectData.title} · 일정</h1>
          <div className="sub">읽기전용 · 후보일 추가/확정은 운영진만 가능합니다</div>
        </div>
      </div>

      <ScheduleAggregationView projectId={projectId} readOnly />
    </div>
  );
}
