import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApplyEntryPage() {
  const supabase = createServerSupabaseClient();

  // 첫 모집중 프로젝트 찾기
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("status", "recruiting")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (project) {
    redirect(`/projects/${project.id}/apply`);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>빠른 지원</h1>
          <div className="sub">현재 모집 중인 프로젝트로 바로 이동합니다</div>
        </div>
      </div>
      <div className="card">
        <div className="empty">
          <Sparkles className="ico" strokeWidth={1.5} />
          <div>지금 모집 중인 프로젝트가 없어요</div>
          <Link href="/projects" className="btn sm mt-12">
            프로젝트 목록 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
