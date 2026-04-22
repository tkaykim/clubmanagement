"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DOW_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

interface ScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
  sort_order: number;
}

interface ApplyFormProps {
  projectId: string;
  projectTitle: string;
  fee: number;
  scheduleDates: ScheduleDate[];
  defaultName: string;
  defaultPhone: string;
}

interface VoteState {
  status: "available" | "maybe" | "unavailable";
  time_slots: Array<{ start: string; end: string }>;
  note: string;
}

export function ApplyForm({
  projectId,
  fee,
  scheduleDates,
  defaultName,
  defaultPhone,
}: ApplyFormProps) {
  const router = useRouter();

  const [motivation, setMotivation] = useState("");
  const [feeAgreement, setFeeAgreement] = useState<"yes" | "partial">("yes");
  const [answersNote, setAnswersNote] = useState("");
  const [loading, setLoading] = useState(false);

  // 가용성 votes state
  const [votes, setVotes] = useState<Record<string, VoteState>>(() => {
    const initial: Record<string, VoteState> = {};
    scheduleDates.forEach(d => {
      initial[d.id] = { status: "available", time_slots: [], note: "" };
    });
    return initial;
  });

  const updateVote = (dateId: string, partial: Partial<VoteState>) => {
    setVotes(prev => ({
      ...prev,
      [dateId]: { ...prev[dateId], ...partial },
    }));
  };

  const formatDow = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return DOW_SHORT[d.getDay()];
  };

  const getDayNum = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").getDate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
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
        toast.error(json.error ?? "지원에 실패했습니다");
        return;
      }

      toast.success("지원이 접수되었습니다");
      router.push(`/projects/${projectId}`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 이름 (readonly) */}
      <div className="field">
        <label>이름</label>
        <input
          className="input"
          value={defaultName}
          readOnly
          style={{ background: "var(--muted)", color: "var(--mf)" }}
        />
      </div>

      {/* 연락처 (readonly) */}
      <div className="field">
        <label>연락처</label>
        <input
          className="input"
          value={defaultPhone || "등록된 연락처 없음"}
          readOnly
          style={{ background: "var(--muted)", color: "var(--mf)" }}
        />
      </div>

      {/* 지원 동기 */}
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

      {/* 출연료 동의 (유료행사만) */}
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

      {/* 메모 */}
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

      {/* 일정 가용성 */}
      {scheduleDates.length > 0 && (
        <div className="field">
          <label>일정 가용 여부 <span className="req">*</span></label>
          <div className="sched">
            {scheduleDates.map(d => {
              const v = votes[d.id];
              return (
                <div key={d.id} className="sched-row">
                  <div className="date-col">
                    <div className="d">{getDayNum(d.date)}</div>
                    <div className="dow">{formatDow(d.date)}</div>
                    {d.label && (
                      <div style={{ fontSize: 10, color: "var(--mf)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                        {d.label}
                      </div>
                    )}
                  </div>
                  <div className="body">
                    <div className="seg full">
                      {[
                        { value: "available", label: "가능" },
                        { value: "maybe", label: "조정가능" },
                        { value: "unavailable", label: "불가" },
                      ].map(o => (
                        <button
                          key={o.value}
                          type="button"
                          className={cn(v?.status === o.value && "on")}
                          onClick={() => updateVote(d.id, { status: o.value as VoteState["status"] })}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {/* 시간 슬롯 */}
                    {v?.status !== "unavailable" && (
                      <div className="timeslots">
                        {(v?.time_slots ?? []).map((slot, i) => (
                          <span key={i} className="slot">
                            {slot.start}~{slot.end}
                            <X
                              size={10}
                              className="x"
                              onClick={() => {
                                const newSlots = [...(v?.time_slots ?? [])];
                                newSlots.splice(i, 1);
                                updateVote(d.id, { time_slots: newSlots });
                              }}
                            />
                          </span>
                        ))}
                        <button
                          type="button"
                          className="slot add"
                          onClick={() => {
                            updateVote(d.id, {
                              time_slots: [...(v?.time_slots ?? []), { start: "10:00", end: "18:00" }],
                            });
                          }}
                        >
                          <Plus size={10} />
                          시간 추가
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
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
          {loading ? "제출 중…" : "지원서 제출"}
        </button>
      </div>
    </form>
  );
}
