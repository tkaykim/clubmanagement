import { BugReportForm } from "@/components/bugs/BugReportForm";
import Link from "next/link";
import { ChevronLeft, Bug } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewBugReportPage() {
  return (
    <div className="page">
      <div className="row mb-12">
        <Link href="/dashboard" className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          홈
        </Link>
        <span className="mono text-xs muted" style={{ letterSpacing: "0.08em" }}>
          BUG REPORT
        </span>
      </div>

      <div className="page-head">
        <div>
          <h1 className="row gap-8" style={{ alignItems: "center" }}>
            <Bug size={22} strokeWidth={2} />
            버그 제보
          </h1>
          <div className="sub">
            이상하거나 안 되는 게 있으면 알려주세요. 자세할수록 빠르게 고쳐집니다.
          </div>
        </div>
      </div>

      <BugReportForm />
    </div>
  );
}
