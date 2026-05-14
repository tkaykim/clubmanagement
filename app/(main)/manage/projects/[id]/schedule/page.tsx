import { ScheduleAggregationView } from "@/components/project/ScheduleAggregationView";
import { ProjectScheduleManager, type ScheduleDateRow } from "@/components/project/ProjectScheduleManager";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ScheduleManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
          <Link href={`/manage/projects/${id}`} className="row gap-6" style={{ color: "var(--mf)", fontSize: 13, textDecoration: "none", marginBottom: 6, display: "inline-flex" }}>
            <ArrowLeft size={14} strokeWidth={2} />
            돌아가기
          </Link>
          <h1>연습 일정 관리</h1>
          <div className="sub">일정 후보 추가/수정/삭제 · 가능 일정 집계 · 일정 확정</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ProjectScheduleManager
          projectId={id}
          initialDates={(scheduleDates ?? []) as ScheduleDateRow[]}
        />
        <ScheduleAggregationView projectId={id} />
      </div>
    </div>
  );
}
