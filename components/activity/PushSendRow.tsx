"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const TARGET_KIND_LABEL: Record<string, string> = {
  all: "전체",
  users: "지정 사용자",
  role: "역할",
  project: "프로젝트 참여자",
  self: "테스트(본인)",
  "announcement-scope": "공지 범위",
  visibility: "프로젝트 공개범위",
};

type PushTarget =
  | { kind: "all" }
  | { kind: "self" }
  | { kind: "users"; userIds?: string[] }
  | { kind: "role"; role?: string }
  | { kind: "project"; projectId?: string }
  | { kind: "visibility"; visibility?: string; projectId?: string }
  | { kind: string };

export type PushSendRowProps = {
  time: string;
  actor: string;
  actionLabel: string;
  targetLabel: string | null;
  meta: {
    target?: PushTarget;
    sent?: number;
    failed?: number;
    total?: number;
    url?: string | null;
    recipientCount?: number | null;
    recipientUserIds?: string[] | null;
    auto?: boolean;
  };
  recipientNames: string[]; // 펼쳤을 때 보여줄 이름 (서버에서 lookup된 결과)
};

function describeTarget(target: PushTarget | undefined): string {
  if (!target) return "?";
  const base = TARGET_KIND_LABEL[target.kind] ?? target.kind;
  if (target.kind === "role" && "role" in target && target.role) {
    return `${base}: ${target.role}`;
  }
  if (target.kind === "visibility" && "visibility" in target && target.visibility) {
    return `${base}: ${target.visibility}`;
  }
  return base;
}

export function PushSendRow({
  time,
  actor,
  actionLabel,
  targetLabel,
  meta,
  recipientNames,
}: PushSendRowProps) {
  const [open, setOpen] = useState(false);
  const ids = meta.recipientUserIds ?? null;
  const count = meta.recipientCount ?? meta.total ?? 0;
  const targetText = describeTarget(meta.target);
  const sent = meta.sent ?? 0;
  const total = meta.total ?? 0;
  const canExpand = (ids && ids.length > 0) || count > 0;

  return (
    <>
      <tr
        onClick={() => canExpand && setOpen((v) => !v)}
        style={{ cursor: canExpand ? "pointer" : "default" }}
      >
        <td className="mono text-xs muted">{time}</td>
        <td>{actor}</td>
        <td>
          <span className="badge">{actionLabel}</span>
          {meta.auto && (
            <span className="badge" style={{ marginLeft: 6, opacity: 0.7 }}>
              자동
            </span>
          )}
        </td>
        <td>{targetLabel ?? "—"}</td>
        <td className="text-xs muted">
          {canExpand && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {open ? (
                <ChevronDown size={12} strokeWidth={2} />
              ) : (
                <ChevronRight size={12} strokeWidth={2} />
              )}
            </span>
          )}
          {`대상: ${targetText} · 발송 ${sent}/${total}`}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ background: "var(--bg-soft)", padding: "10px 14px" }}>
            <div className="text-xs muted" style={{ marginBottom: 6 }}>
              수신자
            </div>
            {recipientNames.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {recipientNames.map((n, i) => (
                  <span
                    key={i}
                    className="badge"
                    style={{ fontSize: 11 }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            ) : ids === null ? (
              <div className="text-xs muted">
                전체 {count}명에게 발송 (목록은 100명 이하일 때만 기록됨)
              </div>
            ) : (
              <div className="text-xs muted">수신자 정보 없음</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
