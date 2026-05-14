"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VoteScheduleEditor,
  initialVotesFromSchedule,
  type VotesMap,
} from "./VoteScheduleEditor";

interface ScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
  sort_order: number;
}

export interface ApplyFormInitial {
  motivation: string;
  fee_agreement: "yes" | "partial";
  answers_note: string;
  /** DB created_at (ISO), 제출 일시 수정용 */
  submitted_at: string;
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToISO(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

interface ApplyFormProps {
  projectId: string;
  projectTitle: string;
  fee: number;
  scheduleDates: ScheduleDate[];
  defaultName: string;
  defaultPhone: string;
  mode?: "create" | "edit" | "vote-only";
  initialApplication?: ApplyFormInitial;
  initialVotes?: VotesMap;
  /** 사용자가 아직 명시적으로 투표하지 않은 schedule_date id 들 */
  initialUnvotedIds?: string[];
}

export function ApplyForm({
  projectId,
  fee,
  scheduleDates,
  defaultName,
  defaultPhone,
  mode = "create",
  initialApplication,
  initialVotes,
  initialUnvotedIds,
}: ApplyFormProps) {
  const router = useRouter();
  const isVoteOnly = mode === "vote-only";
  const isEdit = mode === "edit" || isVoteOnly;
  const appReadonly = isVoteOnly;

  const [motivation, setMotivation] = useState(initialApplication?.motivation ?? "");
  const [feeAgreement, setFeeAgreement] = useState<"yes" | "partial">(
    initialApplication?.fee_agreement ?? "yes"
  );
  const [answersNote, setAnswersNote] = useState(initialApplication?.answers_note ?? "");
  const [submittedAtLocal, setSubmittedAtLocal] = useState(() =>
    isEdit && initialApplication?.submitted_at
      ? isoToDatetimeLocal(initialApplication.submitted_at)
      : ""
  );
  const [loading, setLoading] = useState(false);

  const [votes, setVotes] = useState<VotesMap>(
    () => initialVotes ?? initialVotesFromSchedule(scheduleDates)
  );
  const [unvotedIds, setUnvotedIds] = useState<Set<string>>(
    () => new Set(initialUnvotedIds ?? [])
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 클라이언트 사전 검증: 부분가능인데 시간대 비어있는 경우
    for (const d of scheduleDates) {
      if (unvotedIds.has(d.id)) continue;
      const v = votes[d.id];
      if (v?.status === "partial" && v.time_slots.length === 0) {
        toast.error("부분가능으로 표시한 날짜는 시간대를 1개 이상 지정해주세요");
        return;
      }
    }

    // 미투표 날짜는 votes 페이로드에서 제외 — 서버에서 upsert되지 않음
    const filteredVotes: VotesMap = {};
    for (const [dateId, v] of Object.entries(votes)) {
      if (!unvotedIds.has(dateId)) filteredVotes[dateId] = v;
    }

    setLoading(true);
    try {
      // vote-only: 투표 API만 호출 (지원 정보는 잠금)
      if (isVoteOnly) {
        const res = await fetch(`/api/projects/${projectId}/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ votes: filteredVotes }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || (json as { error?: string }).error) {
          toast.error((json as { error?: string }).error ?? "투표 저장에 실패했습니다");
          return;
        }
        if (unvotedIds.size > 0) {
          toast.success(`투표를 저장했어요 — 아직 ${unvotedIds.size}개 일정은 미투표`);
        } else {
          toast.success("투표를 저장했어요");
        }
        router.push(`/projects/${projectId}`);
        router.refresh();
        return;
      }

      const payload: Record<string, unknown> = {
        motivation,
        fee_agreement: feeAgreement,
        answers_note: answersNote,
        votes: filteredVotes,
      };
      if (isEdit && submittedAtLocal) {
        payload.submitted_at = datetimeLocalToISO(submittedAtLocal);
      }

      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        toast.error(json.error ?? (isEdit ? "수정에 실패했습니다" : "지원에 실패했습니다"));
        return;
      }

      if (unvotedIds.size > 0) {
        toast.success(
          (isEdit ? "지원 내용을 수정했습니다" : "지원이 접수되었습니다") +
            ` — 아직 ${unvotedIds.size}개 일정은 미투표`
        );
      } else {
        toast.success(isEdit ? "지원 내용을 수정했습니다" : "지원이 접수되었습니다");
      }
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  async function handleWithdraw() {
    if (
      !confirm(
        "지원을 취소하면 이 프로젝트에 남긴 가능 일정 투표도 함께 삭제됩니다. 계속할까요?"
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || (json as { error?: string }).error) {
        toast.error(
          (json as { error?: string }).error ?? "지원 취소에 실패했습니다"
        );
        return;
      }
      toast.success("지원을 취소했습니다");
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {isVoteOnly ? (
        <div
          className="row gap-8"
          style={{
            alignItems: "flex-start",
            padding: "10px 12px",
            marginBottom: 16,
            background: "var(--accent-soft, #dbeafe)",
            color: "var(--accent, #1d4ed8)",
            border: "1px solid var(--accent, #1d4ed8)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <Info size={14} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            확정된 지원입니다 — 일정 투표만 수정할 수 있어요. 지원 정보 변경이 필요하면 운영진에게 문의해주세요.
          </div>
        </div>
      ) : isEdit && (
        <div
          className="row gap-8"
          style={{
            alignItems: "flex-start",
            padding: "10px 12px",
            marginBottom: 16,
            background: "var(--accent-soft, #dbeafe)",
            color: "var(--accent, #1d4ed8)",
            border: "1px solid var(--accent, #1d4ed8)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <Info size={14} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            이미 지원한 프로젝트입니다. 내용을 수정하고 저장하면 기존 지원서가 갱신됩니다.
          </div>
        </div>
      )}

      {!isVoteOnly && (
      <div className="field">
        <label>이름</label>
        <input
          className="input"
          value={defaultName}
          readOnly
          style={{ background: "var(--muted)", color: "var(--mf)" }}
        />
      </div>
      )}

      {!isVoteOnly && (
      <div className="field">
        <label>연락처</label>
        <input
          className="input"
          value={defaultPhone || "등록된 연락처 없음"}
          readOnly
          style={{ background: "var(--muted)", color: "var(--mf)" }}
        />
      </div>
      )}

      {!isVoteOnly && (
      <div className="field">
        <label htmlFor="motivation">지원 동기</label>
        <textarea
          id="motivation"
          className="textarea"
          placeholder="지원 동기를 작성해 주세요"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={4}
          readOnly={appReadonly}
          style={appReadonly ? { background: "var(--muted)", color: "var(--mf)" } : undefined}
        />
      </div>
      )}

      {!isVoteOnly && fee > 0 && (
        <div className="field">
          <label>출연료 동의 <span className="req">*</span></label>
          <div className="seg full">
            {[
              { value: "yes", label: `동의 (₩${fee.toLocaleString("ko-KR")})` },
              { value: "partial", label: "조율 필요" },
            ].map(o => (
              <button
                key={o.value}
                type="button"
                className={cn(feeAgreement === o.value && "on")}
                onClick={() => !appReadonly && setFeeAgreement(o.value as "yes" | "partial")}
                disabled={appReadonly}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isVoteOnly && (
      <div className="field">
        <label htmlFor="answersNote">
          메모 / 특이사항
          <span className="hint">선택</span>
        </label>
        <textarea
          id="answersNote"
          className="textarea"
          placeholder="관리자에게 전달할 내용이 있으면 작성해 주세요"
          value={answersNote}
          onChange={(e) => setAnswersNote(e.target.value)}
          rows={2}
          readOnly={appReadonly}
          style={appReadonly ? { background: "var(--muted)", color: "var(--mf)" } : undefined}
        />
      </div>
      )}

      {!isVoteOnly && isEdit && (
        <div className="field">
          <label htmlFor="submittedAt">
            제출 일시
            <span className="hint">신청 순서·표시용 시각을 직접 바로잡을 수 있습니다</span>
          </label>
          <input
            id="submittedAt"
            type="datetime-local"
            className="input"
            value={submittedAtLocal}
            onChange={(e) => setSubmittedAtLocal(e.target.value)}
          />
        </div>
      )}

      {scheduleDates.length > 0 && (
        <div className="field">
          <label>가능 일정 <span className="req">*</span></label>
          <VoteScheduleEditor
            scheduleDates={scheduleDates}
            value={votes}
            onChange={setVotes}
            unvotedIds={unvotedIds}
            onUnvotedChange={setUnvotedIds}
          />
        </div>
      )}

      <div className="row" style={{ justifyContent: "space-between", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {isEdit && !isVoteOnly ? (
          <button
            type="button"
            className="btn ghost"
            style={{ color: "var(--destructive, #b91c1c)" }}
            onClick={handleWithdraw}
            disabled={loading}
          >
            지원 취소
          </button>
        ) : (
          <span />
        )}
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            닫기
          </button>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading
              ? (isVoteOnly ? "저장 중…" : isEdit ? "저장 중…" : "제출 중…")
              : (isVoteOnly ? "투표 저장" : isEdit ? "변경사항 저장" : "지원서 제출")}
          </button>
        </div>
      </div>
    </form>
  );
}
