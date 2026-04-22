import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { NewProjectForm } from "@/components/project/NewProjectForm";

export default function NewProjectPage() {
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
          <h1>새 프로젝트</h1>
          <div className="sub">공연 · 연습 · 오디션 프로젝트 생성</div>
        </div>
      </div>
      <NewProjectForm />
    </div>
  );
}
