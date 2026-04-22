import { ScheduleAggregationView } from "@/components/project/ScheduleAggregationView";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ScheduleManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link href={`/manage/projects/${id}`} className="row gap-6" style={{ color: "var(--mf)", fontSize: 13, textDecoration: "none", marginBottom: 6, display: "inline-flex" }}>
            <ArrowLeft size={14} strokeWidth={2} />
            돌아가기
          </Link>
          <h1>연습 일정 관리</h1>
          <div className="sub">가능 일정 집계 · 일정 확정</div>
        </div>
      </div>
      <ScheduleAggregationView projectId={id} />
    </div>
  );
}
