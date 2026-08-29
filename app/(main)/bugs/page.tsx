import Link from "next/link";
import { redirect } from "next/navigation";
import { Bug, Plus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MyBugReportList } from "@/components/bugs/MyBugReportList";
import type { BugReportWithComments } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyBugReportsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bugs } = await supabase
    .from("bug_reports")
    .select("*, comments:bug_report_comments(*)")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="row gap-8" style={{ alignItems: "center" }}>
            <Bug size={22} strokeWidth={2} />
            내 버그 제보
          </h1>
          <div className="sub">
            내가 보낸 제보의 처리 상태와 운영팀 답변을 확인할 수 있습니다.
          </div>
        </div>
        <Link href="/bugs/new" className="btn primary">
          <Plus size={14} strokeWidth={2} />
          새 제보
        </Link>
      </div>

      <MyBugReportList bugs={(bugs ?? []) as BugReportWithComments[]} />
    </div>
  );
}
