"use client";

import { useState } from "react";
import { Bug, MessageCircle } from "lucide-react";
import type { BugReportWithComments, BugStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BugReportComments } from "./BugReportComments";
import { Linkify } from "@/lib/text/Linkify";

const STATUS_LABEL: Record<BugStatus, string> = {
  open: "접수됨",
  in_progress: "확인 중",
  resolved: "해결됨",
  wontfix: "보류됨",
  duplicate: "같은 제보 있음",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "가벼움",
  medium: "보통",
  high: "심각",
  blocker: "사용하기 어려움",
};

export function MyBugReportList({ bugs }: { bugs: BugReportWithComments[] }) {
  const [reports, setReports] = useState(bugs);

  if (reports.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <Bug className="ico" strokeWidth={1.5} />
          <div>아직 보낸 제보가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {reports.map((bug) => (
        <details key={bug.id} className="card" open={bug.status !== "resolved"}>
          <summary
            style={{ cursor: "pointer", listStyle: "none", minHeight: 44 }}
          >
            <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <span className={cn("badge", statusKind(bug.status))}>
                {STATUS_LABEL[bug.status]}
              </span>
              <span className="badge outline">
                {SEVERITY_LABEL[bug.severity] ?? bug.severity}
              </span>
              <strong className="flex-1" style={{ minWidth: 180 }}>
                {bug.title}
              </strong>
              <span className="row gap-4 muted text-xs" style={{ alignItems: "center" }}>
                <MessageCircle size={12} />
                {bug.comments?.length ?? 0}
              </span>
              <time className="muted text-xs" dateTime={bug.created_at}>
                {new Date(bug.created_at).toLocaleDateString("ko-KR")}
              </time>
            </div>
          </summary>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 14 }}>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 13.5,
                lineHeight: 1.65,
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Linkify text={bug.description} />
            </div>
            <BugReportComments
              bugId={bug.id}
              initialComments={bug.comments ?? []}
              onCommentAdded={(comment) =>
                setReports((current) =>
                  current.map((report) =>
                    report.id === bug.id
                      ? {
                          ...report,
                          comments: [...(report.comments ?? []), comment],
                        }
                      : report
                  )
                )
              }
            />
          </div>
        </details>
      ))}
    </div>
  );
}

function statusKind(status: BugStatus): string {
  if (status === "resolved") return "ok";
  if (status === "in_progress") return "info";
  if (status === "open") return "warn";
  return "outline";
}
