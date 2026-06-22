import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getProjectAccess } from "@/lib/auth";
import { ScheduleAggregationView } from "@/components/project/ScheduleAggregationView";
import { ProjectScheduleManager, type ScheduleDateRow } from "@/components/project/ProjectScheduleManager";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// 프로젝트 관리자 / 운영진 공용 — 운영진이 보는 일정 관리 화면을 동일하게 재사용.
export default async function ManagerSchedulePage({ params }: Props) {
  const { id } = await params;

  const access = await getProjectAccess(id);
  if (!access) notFound();

  const supabase = createServerSupabaseClient();
  const { data: scheduleDates } = await supabase
    .from("schedule_dates")
    .select("id, project_id, date, label, kind, sort_order")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .order("date", { ascending: true });

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
          <h1>연습 일정</h1>
          <div className="sub">일정 후보 · 가능 일정 집계 · 일정 확정</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {access === "admin" && (
          <ProjectScheduleManager
            projectId={id}
            initialDates={(scheduleDates ?? []) as ScheduleDateRow[]}
          />
        )}
        <ScheduleAggregationView projectId={id} readOnly={access !== "admin"} />
      </div>
    </div>
  );
}
