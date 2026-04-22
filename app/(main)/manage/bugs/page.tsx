import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BugReportAdminList } from "@/components/bugs/BugReportAdminList";
import { ChevronLeft, Bug } from "lucide-react";
import type { BugReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBugsPage() {
  const supabase = createServerSupabaseClient();

  // admin 체크
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("crew_members")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin =
    (me?.role === "admin" || me?.role === "owner") && me?.is_active === true;
  if (!isAdmin) redirect("/");

  const { data: bugs } = await supabase
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href="/manage" className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          관리
        </Link>
      </div>

      <div className="page-head">
        <div>
          <h1 className="row gap-8" style={{ alignItems: "center" }}>
            <Bug size={22} strokeWidth={2} />
            버그 리포트
          </h1>
          <div className="sub">사용자가 보낸 제보를 확인하고 처리 상태를 관리합니다</div>
        </div>
      </div>

      <BugReportAdminList bugs={(bugs ?? []) as BugReport[]} />
    </div>
  );
}
