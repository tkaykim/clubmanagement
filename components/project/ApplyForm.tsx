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
}

interface ApplyFormProps {
  projectId: string;
  projectTitle: string;
  fee: number;
  scheduleDates: ScheduleDate[];
  defaultName: string;
  defaultPhone: string;
  mode?: "create" | "edit";
  initialApplication?: ApplyFormInitial;
  initialVotes?: VotesMap;
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
}: ApplyFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [motivation, setMotivation] = useState(initialApplication?.motivation ?? "");
  const [feeAgreement, setFeeAgreement] = useState<"yes" | "partial">(
    initialApplication?.fee_agreement ?? "yes"
  );
  const [answersNote, setAnswersNote] = useState(initialApplication?.answers_note ?? "");
  const [loading, setLoading] = useState(false);

  const [votes, setVotes] = useState<VotesMap>(
    () => initialVotes ?? initialVotesFromSchedule(scheduleDates)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 클라이언트 사전 검증: 부분가능인데 시간대 비어있는 경우
    for (const d of scheduleDates) {
      const v = votes[d.id];
      if (v?.status === "partial" && v.time_slots.length === 0) {
        toast.error("부분가능으로 표시한 날짜는 시간대를 1개 이상 지정해주세요");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivation,
          fee_agreement: feeAgreement,
          answers_note: answersNote,
          votes,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        toast.error(json.error ?? (isEdit ? "수정에 실패했습니다" : "지원에 실패했습니다"));
        return;
      }

      toast.success(isEdit ? "지원 내용을 수정했습니다" : "지원이 접수되었습니다");
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {isEdit && (
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

      <div className="field">
        <label>이름</label>
        <input
          className="input"
          value={defaultName}
          readOnly
          style={{ background: "var(--muted)", color: "var(--mf)" }}
        />
      </div>

      <div className="field">
        <label>연락처</label>
        <input
          className="input"
          value={defaultPhone || "등록된 연락처 없음"}
          readOnly
          style={{ background: "var(--muted)", color: "var(--mf)" }}
        />
      </div>

      <div className="field">
        <label htmlFor="motivation">지원 동기</label>
        <textarea
          id="motivation"
          className="textarea"
          placeholder="지원 동기를 작성해 주세요"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={4}
        />
      </div>

      {fee > 0 && (
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
                onClick={() => setFeeAgreement(o.value as "yes" | "partial")}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
        />
      </div>

      {scheduleDates.length > 0 && (
        <div className="field">
          <label>가능 일정 <span className="req">*</span></label>
          <VoteScheduleEditor
            scheduleDates={scheduleDates}
            value={votes}
            onChange={setVotes}
          />
        </div>
      )}

      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => router.back()}
          disabled={loading}
        >
          취소
        </button>
        <button type="submit" className="btn primary" disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading
            ? (isEdit ? "저장 중…" : "제출 중…")
            : (isEdit ? "변경사항 저장" : "지원서 제출")}
        </button>
      </div>
    </form>
  );
}
