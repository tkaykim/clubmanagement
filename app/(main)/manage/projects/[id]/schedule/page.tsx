import { MobileHeader } from "@/components/layout/MobileHeader";
import { ScheduleAggregationView } from "@/components/project/ScheduleAggregationView";

export const dynamic = "force-dynamic";

export default async function ScheduleManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <MobileHeader title="연습 일정 관리" backHref="/manage" />
      <div className="px-4 py-4">
        <ScheduleAggregationView projectId={id} />
      </div>
    </div>
  );
}
