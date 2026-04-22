"use client";

import { useState } from "react";
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

interface PublicApplyFormProps {
  projectId: string;
  fee: number;
  scheduleDates: ScheduleDate[];
}

interface VoteState {
  status: "available" | "maybe" | "unavailable";
  time_slots: Array<{ start: string; end: string }>;
}

export function PublicApplyForm({ projectId, fee, scheduleDates }: PublicApplyFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [motivation, setMotivation] = useState("");
  const [feeAgreement, setFeeAgreement] = useState<"yes" | "partial">("yes");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [votes, setVotes] = useState<Record<string, VoteState>>(() => {
    const initial: Record<string, VoteState> = {};
    scheduleDates.forEach(d => {
      initial[d.id] = { status: "available", time_slots: [] };
    });
    return initial;
  });

  const updateVote = (dateId: string, partial: Partial<VoteState>) => {
    setVotes(prev => ({ ...prev, [dateId]: { ...prev[dateId], ...partial } }));
  };

  const getDayNum = (dateStr: string) => new Date(dateStr + "T00:00:00").getDate();
  const getDow = (dateStr: string) => DOW_SHORT[new Date(dateStr + "T00:00:00").getDay()];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("이름과 이메일을 입력해 주세요");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: name.trim(),
          guest_email: email.trim(),
          guest_phone: phone.trim() || null,
          motivation: motivation.trim() || null,
          fee_agreement: feeAgreement,
          votes,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "제출에 실패했습니다");
      } else {
        setDone(true);
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>지원이 접수되었습니다</h3>
        <p style={{ color: "var(--mf)", fontSize: 13, lineHeight: 1.7 }}>
          관리자가 검토 후 연락드릴 예정입니다.<br />
          지원해 주셔서 감사합니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="g-name">이름 <span className="req">*</span></label>
        <input id="g-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" required />
      </div>
      <div className="field">
        <label htmlFor="g-email">이메일 <span className="req">*</span></label>
        <input id="g-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
      </div>
      <div className="field">
        <label htmlFor="g-phone">연락처</label>
        <input id="g-phone" className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
      </div>
      <div className="field">
        <label htmlFor="g-motivation">지원 동기</label>
        <textarea id="g-motivation" className="textarea" value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="지원하게 된 이유를 간단히 적어주세요" rows={3} />
      </div>

      {fee > 0 && (
        <div className="field">
          <label>출연료 동의 <span className="req">*</span></label>
          <div className="seg full">
            {[
              { value: "yes", label: `동의 (₩${fee.toLocaleString("ko-KR")})` },
              { value: "partial", label: "조율 필요" },
            ].map(o => (
              <button key={o.value} type="button" className={cn(feeAgreement === o.value && "on")} onClick={() => setFeeAgreement(o.value as "yes" | "partial")}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {scheduleDates.length > 0 && (
        <div className="field">
          <label>가능 일정</label>
          <div className="sched">
            {scheduleDates.map(d => {
              const v = votes[d.id];
              return (
                <div key={d.id} className="sched-row">
                  <div className="date-col">
                    <div className="d">{getDayNum(d.date)}</div>
                    <div className="dow">{getDow(d.date)}</div>
                  </div>
                  <div className="body">
                    <div className="seg full">
                      {[
                        { value: "available", label: "가능" },
                        { value: "maybe", label: "조정가능" },
                        { value: "unavailable", label: "불가" },
                      ].map(o => (
                        <button key={o.value} type="button" className={cn(v?.status === o.value && "on")} onClick={() => updateVote(d.id, { status: o.value as VoteState["status"] })}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {v?.status !== "unavailable" && (
                      <div className="timeslots">
                        {(v?.time_slots ?? []).map((slot, i) => (
                          <span key={i} className="slot">
                            {slot.start}~{slot.end}
                            <X size={10} className="x" onClick={() => {
                              const s = [...(v?.time_slots ?? [])]; s.splice(i, 1);
                              updateVote(d.id, { time_slots: s });
                            }} />
                          </span>
                        ))}
                        <button type="button" className="slot add" onClick={() => updateVote(d.id, { time_slots: [...(v?.time_slots ?? []), { start: "10:00", end: "18:00" }] })}>
                          <Plus size={10} />시간 추가
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

      <button type="submit" className="btn primary" style={{ width: "100%", justifyContent: "center", height: 44, fontSize: 14, marginTop: 8 }} disabled={loading}>
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "제출 중…" : "지원서 제출"}
      </button>
    </form>
  );
}
