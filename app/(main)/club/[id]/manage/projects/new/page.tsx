import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NewProjectForm } from "@/components/project/NewProjectForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: club } = await supabase.from("clubs").select("name").eq("id", id).single();
  if (!club) notFound();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Link href={`/club/${id}/manage/projects`}>
          <Button variant="ghost" size="icon" className="size-9 rounded-full">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">새 프로젝트</h1>
      </div>
      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          프로젝트를 만든 뒤 모집 폼(제목, 설명, 사진, 설문 문항)을 자유롭게 편집할 수 있습니다.
        </p>
        <NewProjectForm clubId={id} />
      </div>
    </div>
  );
}
