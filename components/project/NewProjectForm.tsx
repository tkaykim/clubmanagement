"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROJECT_TYPES = [
  { value: "paid_gig", label: "유료행사" },
  { value: "practice", label: "연습" },
  { value: "audition", label: "오디션" },
  { value: "workshop", label: "워크숍" },
] as const;

const PROJECT_STATUSES = [
  { value: "recruiting", label: "모집중" },
  { value: "selecting", label: "선별중" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
] as const;

type ProjectType = "paid_gig" | "practice" | "audition" | "workshop";

export function NewProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectType>("paid_gig");
  const [status, setStatus] = useState("recruiting");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState(0);
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scheduleUndecided, setScheduleUndecided] = useState(false);
  const [recruitmentEndAt, setRecruitmentEndAt] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [scheduleDates, setScheduleDates] = useState<Array<{ date: string; kind: "event" | "practice"; label: string }>>([]);
  const [newDate, setNewDate] = useState("");
  const [newKind, setNewKind] = useState<"event" | "practice">("event");
  const [newLabel, setNewLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addDate = () => {
    if (!newDate) return;
    if (scheduleDates.some(d => d.date === newDate)) return;
    setScheduleDates(prev => [...prev, { date: newDate, kind: newKind, label: newLabel }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate("");
    setNewLabel("");
  };

  const removeDate = (date: string) => {
    setScheduleDates(prev => prev.filter(d => d.date !== date));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("프로젝트 제목을 입력하세요");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          status,
          description: description.trim() || null,
          fee: fee || 0,
          venue: venue.trim() || null,
          address: address.trim() || null,
          start_date: scheduleUndecided ? null : startDate || null,
          end_date: scheduleUndecided ? null : endDate || null,
          schedule_undecided: scheduleUndecided,
          recruitment_end_at: recruitmentEndAt || null,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          dates: scheduleDates,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        toast.error(json.error ?? "생성에 실패했습니다");
        return;
      }

      toast.success("프로젝트가 생성되었습니다");
      router.push(`/manage/projects/${json.data?.id ?? ""}?tab=applications`);
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="os-grid grid-2">
        {/* 왼쪽 — 기본 정보 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-head"><h3>기본 정보</h3></div>
            <div style={{ padding: 18 }}>
              <div className="field">
                <label htmlFor="title">제목 <span className="req">*</span></label>
                <input id="title" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="2026 정기 공연" required />
              </div>

              <div className="field">
                <label>종류 <span className="req">*</span></label>
                <div className="seg full">
                  {PROJECT_TYPES.map(t => (
                    <button key={t.value} type="button" className={cn(type === t.value && "on")} onClick={() => setType(t.value)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="status">상태</label>
                <select id="status" className="select" value={status} onChange={e => setStatus(e.target.value)}>
                  {PROJECT_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="description">설명</label>
                <textarea id="description" className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="프로젝트 소개" rows={3} />
              </div>

              {type === "paid_gig" && (
                <div className="field">
                  <label htmlFor="fee">출연료 (원)</label>
                  <input id="fee" className="input" type="number" min={0} step={10000} value={fee} onChange={e => setFee(Number(e.target.value))} placeholder="0" />
                </div>
              )}

              <div className="field">
                <label htmlFor="venue">장소</label>
                <input id="venue" className="input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="공연장 이름" />
              </div>

              <div className="field">
                <label htmlFor="address">주소</label>
                <input id="address" className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="상세 주소" />
              </div>

              <div className="field">
                <label htmlFor="recruitmentEnd">모집 마감</label>
                <input id="recruitmentEnd" className="input" type="date" value={recruitmentEndAt} onChange={e => setRecruitmentEndAt(e.target.value)} />
              </div>

              <div className="field">
                <label htmlFor="maxParticipants">최대 인원 <span className="hint">선택</span></label>
                <input id="maxParticipants" className="input" type="number" min={1} value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="제한 없음" />
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 — 일정 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>프로젝트 일정</h3>
              <div style={{ marginLeft: "auto" }}>
                <label className="row gap-6" style={{ fontSize: 12.5, color: "var(--mf)", cursor: "pointer" }}>
                  <button
                    type="button"
                    className={cn("cbx", scheduleUndecided && "on")}
                    onClick={() => setScheduleUndecided(v => !v)}
                    role="checkbox"
                    aria-checked={scheduleUndecided}
                  />
                  미정
                </label>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              {!scheduleUndecided && (
                <>
                  <div className="os-grid grid-2" style={{ gap: 12, marginBottom: 14 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor="startDate">시작일</label>
                      <input id="startDate" className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor="endDate">종료일</label>
                      <input id="endDate" className="input" type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* 일정 날짜 목록 */}
              <div className="field">
                <label>일정 날짜 <span className="hint">투표 대상</span></label>
                <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
                  <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                  <select className="select" value={newKind} onChange={e => setNewKind(e.target.value as "event" | "practice")}>
                    <option value="event">본행사</option>
                    <option value="practice">연습</option>
                  </select>
                </div>
                <input className="input" placeholder="레이블 (선택)" value={newLabel} onChange={e => setNewLabel(e.target.value)} style={{ marginBottom: 8 }} />
                <button type="button" className="btn sm" onClick={addDate} disabled={!newDate} style={{ width: "100%", justifyContent: "center" }}>
                  <Plus size={12} strokeWidth={2} />
                  날짜 추가
                </button>
              </div>

              {scheduleDates.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {scheduleDates.map(d => (
                    <div key={d.date} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", justifyContent: "space-between" }}>
                      <div>
                        <span className="mono text-xs">{d.date}</span>
                        <span className="badge" style={{ marginLeft: 8 }}>{d.kind === "event" ? "본행사" : "연습"}</span>
                        {d.label && <span style={{ fontSize: 12, color: "var(--mf)", marginLeft: 8 }}>{d.label}</span>}
                      </div>
                      <button type="button" className="btn ghost icon-only sm" onClick={() => removeDate(d.date)}>
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
        <button type="button" className="btn ghost" onClick={() => router.back()} disabled={submitting}>
          취소
        </button>
        <button type="submit" className="btn primary lg" disabled={submitting}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
