import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ACTION_LABELS } from "@/lib/activity-log";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type Props = {
  searchParams: Promise<{ action?: string; cursor?: string }>;
};

type LogRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function describeMeta(action: string, meta: Record<string, unknown> | null): string {
  if (!meta) return "";
  if (action === "project.status_change") {
    const from = meta.from ?? "—";
    const to = meta.to ?? "—";
    return `${from} → ${to}`;
  }
  if (action === "project.update" && Array.isArray(meta.changedFields)) {
    return `필드: ${(meta.changedFields as string[]).join(", ")}`;
  }
  if (action === "push.send") {
    const t = meta.target as { kind?: string } | undefined;
    const sent = meta.sent ?? 0;
    const total = meta.total ?? 0;
    return `대상: ${t?.kind ?? "?"} · 발송 ${sent}/${total}`;
  }
  if (action === "application.create" && meta.isGuest) {
    return "게스트 지원";
  }
  return "";
}

export default async function ActivityLogPage({ searchParams }: Props) {
  const { action: actionFilter } = await searchParams;
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("activity_logs")
    .select("id, actor_user_id, actor_name, action, target_type, target_id, target_label, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (actionFilter && actionFilter !== "all") {
    query = query.eq("action", actionFilter);
  }

  const { data: logs, error } = await query;
  const rows: LogRow[] = error ? [] : ((logs ?? []) as LogRow[]);

  // actor 이름 보완 — actor_name이 비어 있으면 crew_members에서 lookup
  const userIds = Array.from(
    new Set(
      rows
        .filter((r) => !r.actor_name && r.actor_user_id)
        .map((r) => r.actor_user_id as string)
    )
  );
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: members } = await supabase
      .from("crew_members")
      .select("user_id, name, stage_name")
      .in("user_id", userIds);
    for (const m of (members ?? []) as Array<{
      user_id: string;
      name: string;
      stage_name: string | null;
    }>) {
      nameMap.set(m.user_id, m.stage_name ?? m.name);
    }
  }

  const actionsAll: Array<{ value: string; label: string }> = [
    { value: "all", label: "전체" },
    ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>활동 로그</h1>
          <div className="sub">최근 {rows.length}건 · 시스템 자동 기록 (삭제 불가)</div>
        </div>
      </div>

      <nav className="tabs" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        {actionsAll.map((a) => (
          <a
            key={a.value}
            href={a.value === "all" ? "/manage/activity" : `/manage/activity?action=${a.value}`}
            className={`tab ${(actionFilter ?? "all") === a.value ? "on" : ""}`}
          >
            {a.label}
          </a>
        ))}
      </nav>

      <div className="card flush">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 150 }}>시각</th>
              <th style={{ width: 120 }}>행위자</th>
              <th style={{ width: 160 }}>액션</th>
              <th>대상</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", padding: "40px 0", color: "var(--mf)" }}
                >
                  <History
                    size={24}
                    strokeWidth={1.5}
                    style={{ margin: "0 auto 10px", display: "block", color: "var(--mf-2)" }}
                  />
                  활동 로그가 없어요
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const actor =
                  r.actor_name ??
                  (r.actor_user_id ? nameMap.get(r.actor_user_id) : null) ??
                  (r.actor_user_id ? "—" : "게스트");
                return (
                  <tr key={r.id}>
                    <td className="mono text-xs muted">{formatDate(r.created_at)}</td>
                    <td>{actor}</td>
                    <td>
                      <span className="badge">{ACTION_LABELS[r.action] ?? r.action}</span>
                    </td>
                    <td>{r.target_label ?? "—"}</td>
                    <td className="text-xs muted">{describeMeta(r.action, r.meta)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
