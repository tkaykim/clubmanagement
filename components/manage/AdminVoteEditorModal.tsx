"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VoteScheduleEditor,
  type VotesMap,
} from "@/components/project/VoteScheduleEditor";
import type { ScheduleDateLite } from "@/components/project/TimeRangeModal";

export interface AdminVoteEditorApplication {
  id: string;
  user_id: string | null;
  status: string;
  crew_members: { name: string; stage_name: string | null } | null;
  guest_name: string | null;
}

interface Props {
  open: boolean;
  projectId: string;
  application: AdminVoteEditorApplication | null;
  scheduleDates: ScheduleDateLite[];
  initialVotes: VotesMap;
  onClose: () => void;
}

function appName(a: AdminVoteEditorApplication): string {
  const stage = a.crew_members?.stage_name?.trim();
  const real = a.crew_members?.name?.trim();
  return stage || real || a.guest_name || "지원자";
}

function votesEqual(a: VotesMap, b: VotesMap): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const va = a[k];
    const vb = b[k];
    if (!vb) return false;
    if (va.status !== vb.status) return false;
    if ((va.note ?? "") !== (vb.note ?? "")) return false;
    if (va.time_slots.length !== vb.time_slots.length) return false;
    for (let i = 0; i < va.time_slots.length; i++) {
      const sa = va.time_slots[i];
      const sb = vb.time_slots[i];
      if (
        sa.start !== sb.start ||
        sa.end !== sb.end ||
        (sa.kind ?? "available") !== (sb.kind ?? "available")
      )
        return false;
    }
  }
  return true;
}

export function AdminVoteEditorModal({
  open,
  projectId,
  application,
  scheduleDates,
  initialVotes,
  onClose,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState<VotesMap>(initialVotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialVotes);
      setError(null);
    }
  }, [open, initialVotes]);

  const dirty = useMemo(() => !votesEqual(value, initialVotes), [value, initialVotes]);

  if (!open || !application) return null;

  const name = appName(application);
  const statusLabel =
    application.status === "approved"
      ? "확정"
      : application.status === "rejected"
        ? "탈락"
        : "검토중";

  const handleClose = () => {
    if (dirty && !confirm("저장하지 않은 변경사항이 있습니다. 닫으시겠어요?")) return;
    onClose();
  };

  const handleSave = async () => {
    if (!application.user_id) {
      setError("게스트 지원자는 관리자가 직접 수정할 수 없습니다");
      return;
    }
    // partial 인데 time_slots 비어있는 항목 검증
    for (const [dateId, v] of Object.entries(value)) {
      if (v.status === "partial" && v.time_slots.length === 0) {
        const d = scheduleDates.find((x) => x.id === dateId);
        setError(
          `${d?.date ?? "일부 날짜"} — 부분가능은 시간대 1개 이상 필요합니다`
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      // VotesMap 은 { status, time_slots, note } 그대로 전송 가능
      const payload = {
        votes: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [
            k,
            {
              status: v.status,
              time_slots: v.time_slots,
              note: v.note ?? null,
            },
          ])
        ),
      };
      const res = await fetch(
        `/api/projects/${projectId}/votes/${application.user_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "저장에 실패했습니다");
        return;
      }
      router.refresh();
      onClose();
    } catch (e) {
      console.error(e);
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={handleClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div
          className="row"
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "var(--mf)" }}>가능시간 수정</div>
            <div className="row gap-8" style={{ alignItems: "center", marginTop: 2 }}>
              <strong style={{ fontSize: 16 }}>{name}</strong>
              <span
                className={cn("tag sm")}
                style={{
                  background:
                    application.status === "approved"
                      ? "var(--accent-soft, #dbeafe)"
                      : application.status === "rejected"
                        ? "var(--danger-soft, #fee2e2)"
                        : "var(--muted)",
                  color:
                    application.status === "approved"
                      ? "var(--accent, #1d4ed8)"
                      : application.status === "rejected"
                        ? "var(--danger, #b91c1c)"
                        : "var(--mf)",
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
          }}
        >
          {!application.user_id ? (
            <div
              className="empty"
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--mf)",
              }}
            >
              게스트 지원자의 가능시간은 직접 수정할 수 없어요.
              <br />
              지원자에게 연락해 새로 제출받아 주세요.
            </div>
          ) : (
            <VoteScheduleEditor
              scheduleDates={scheduleDates}
              value={value}
              onChange={setValue}
              showNotice
            />
          )}
        </div>

        {error && (
          <div
            className="row"
            style={{
              padding: "8px 20px",
              background: "var(--danger-soft, #fee2e2)",
              color: "var(--danger, #b91c1c)",
              fontSize: 13,
              borderTop: "1px solid var(--border)",
            }}
          >
            {error}
          </div>
        )}

        <div
          className="row"
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            justifyContent: "flex-end",
            gap: 8,
            background: "var(--bg)",
          }}
        >
          <button type="button" className="btn ghost" onClick={handleClose} disabled={saving}>
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleSave}
            disabled={!dirty || saving || !application.user_id}
          >
            <Save size={14} strokeWidth={2} />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
