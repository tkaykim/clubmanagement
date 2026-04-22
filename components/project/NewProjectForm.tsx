"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, X, Loader2, Trash2, CalendarRange } from "lucide-react";
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

const VISIBILITY_OPTIONS = [
  { value: "public", label: "전체공개", hint: "활성 멤버 누구나" },
  { value: "admin", label: "운영진만", hint: "owner · admin" },
  { value: "private", label: "비공개", hint: "등록자와 owner만" },
] as const;

type ProjectType = "paid_gig" | "practice" | "audition" | "workshop";
type Visibility = "public" | "admin" | "private";
type Kind = "event" | "practice";

type ScheduleDateItem = { date: string; kind: Kind; label: string };

const MAX_RANGE_DAYS = 366;

function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return out;
  const cur = new Date(s);
  while (cur <= e) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function NewProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectType>("paid_gig");
  const [status, setStatus] = useState("recruiting");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState(0);
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [recruitmentEndAt, setRecruitmentEndAt] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [scheduleDates, setScheduleDates] = useState<ScheduleDateItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 단일 추가 입력
  const [newDate, setNewDate] = useState("");
  const [newKind, setNewKind] = useState<Kind>("event");
  const [newLabel, setNewLabel] = useState("");

  // 기간 추가 입력
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeKind, setRangeKind] = useState<Kind>("event");
  const [rangeLabel, setRangeLabel] = useState("");
  const [rangeApplyLabelAll, setRangeApplyLabelAll] = useState(true);

  const sortDates = (arr: ScheduleDateItem[]) =>
    [...arr].sort((a, b) => a.date.localeCompare(b.date));

  const addSingle = () => {
    if (!newDate) return;
    if (scheduleDates.some((d) => d.date === newDate)) {
      toast.error("이미 추가된 날짜입니다");
      return;
    }
    setScheduleDates((prev) =>
      sortDates([...prev, { date: newDate, kind: newKind, label: newLabel }])
    );
    setNewDate("");
    setNewLabel("");
  };

  const addRange = () => {
    if (!rangeStart || !rangeEnd) {
      toast.error("시작일과 종료일을 모두 선택하세요");
      return;
    }
    if (rangeStart > rangeEnd) {
      toast.error("시작일이 종료일보다 늦을 수 없습니다");
      return;
    }
    const all = enumerateDates(rangeStart, rangeEnd);
    if (all.length === 0) {
      toast.error("유효하지 않은 범위입니다");
      return;
    }
    if (all.length > MAX_RANGE_DAYS) {
      toast.error(`범위가 너무 큽니다 (최대 ${MAX_RANGE_DAYS}일)`);
      return;
    }
    const existingSet = new Set(scheduleDates.map((d) => d.date));
    const toAdd: ScheduleDateItem[] = all
      .filter((date) => !existingSet.has(date))
      .map((date) => ({
        date,
        kind: rangeKind,
        label: rangeApplyLabelAll ? rangeLabel : "",
      }));
    if (toAdd.length === 0) {
      toast.error("해당 범위의 날짜가 모두 이미 추가돼 있습니다");
      return;
    }
    setScheduleDates((prev) => sortDates([...prev, ...toAdd]));
    const skipped = all.length - toAdd.length;
    toast.success(
      `${toAdd.length}개 날짜 추가됨` + (skipped > 0 ? ` (중복 ${skipped}개 건너뜀)` : "")
    );
    setRangeStart("");
    setRangeEnd("");
    setRangeLabel("");
  };

  const removeDate = (date: string) => {
    setScheduleDates((prev) => prev.filter((d) => d.date !== date));
  };

  const clearAllDates = () => {
    if (scheduleDates.length === 0) return;
    if (!confirm(`일정 ${scheduleDates.length}개를 전체 삭제할까요?`)) return;
    setScheduleDates([]);
  };

  const updateItem = (date: string, patch: Partial<ScheduleDateItem>) => {
    setScheduleDates((prev) =>
      prev.map((d) => (d.date === date ? { ...d, ...patch } : d))
    );
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
          visibility,
          description: description.trim() || null,
          fee: fee || 0,
          venue: venue.trim() || null,
          address: address.trim() || null,
          recruitment_end_at: recruitmentEndAt || null,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          dates: scheduleDates
            .filter((d) => d.kind === "event")
            .map((d) => ({ date: d.date, label: d.label || null, kind: "event" as const })),
          practiceDates: scheduleDates
            .filter((d) => d.kind === "practice")
            .map((d) => ({ date: d.date, label: d.label || null })),
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
                <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2026 정기 공연" required />
              </div>

              <div className="field">
                <label>종류 <span className="req">*</span></label>
                <div className="seg full">
                  {PROJECT_TYPES.map((t) => (
                    <button key={t.value} type="button" className={cn(type === t.value && "on")} onClick={() => setType(t.value)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="status">상태</label>
                <select id="status" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>열람권한 <span className="req">*</span></label>
                <div className="seg full">
                  {VISIBILITY_OPTIONS.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      className={cn(visibility === v.value && "on")}
                      onClick={() => setVisibility(v.value)}
                      title={v.hint}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="hint" style={{ fontSize: 11.5, color: "var(--mf)", marginTop: 6 }}>
                  {VISIBILITY_OPTIONS.find((v) => v.value === visibility)?.hint}
                </div>
              </div>

              <div className="field">
                <label htmlFor="description">설명</label>
                <textarea id="description" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="프로젝트 소개" rows={3} />
              </div>

              {type === "paid_gig" && (
                <div className="field">
                  <label htmlFor="fee">출연료 (원)</label>
                  <input id="fee" className="input" type="number" min={0} step={10000} value={fee} onChange={(e) => setFee(Number(e.target.value))} placeholder="0" />
                </div>
              )}

              <div className="field">
                <label htmlFor="venue">장소</label>
                <input id="venue" className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="공연장 이름" />
              </div>

              <div className="field">
                <label htmlFor="address">주소</label>
                <input id="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="상세 주소" />
              </div>

              <div className="field">
                <label htmlFor="recruitmentEnd">모집 마감</label>
                <input id="recruitmentEnd" className="input" type="date" value={recruitmentEndAt} onChange={(e) => setRecruitmentEndAt(e.target.value)} />
              </div>

              <div className="field">
                <label htmlFor="maxParticipants">최대 인원 <span className="hint">선택</span></label>
                <input id="maxParticipants" className="input" type="number" min={1} value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="제한 없음" />
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 — 일정 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>프로젝트 일정</h3>
              <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--mf)" }}>
                {scheduleDates.length > 0 ? `${scheduleDates.length}개` : "투표 대상 날짜 0개"}
              </div>
            </div>
            <div style={{ padding: 18 }}>
              {/* 기간으로 추가 */}
              <div className="field" style={{ marginBottom: 18 }}>
                <label className="row gap-6" style={{ alignItems: "center" }}>
                  <CalendarRange size={13} strokeWidth={2} />
                  기간으로 추가
                </label>
                <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
                  <input
                    className="input"
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    placeholder="시작일"
                    aria-label="기간 시작일"
                  />
                  <input
                    className="input"
                    type="date"
                    value={rangeEnd}
                    min={rangeStart || undefined}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    placeholder="종료일"
                    aria-label="기간 종료일"
                  />
                </div>
                <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
                  <select className="select" value={rangeKind} onChange={(e) => setRangeKind(e.target.value as Kind)}>
                    <option value="event">본행사</option>
                    <option value="practice">연습</option>
                  </select>
                  <input
                    className="input"
                    placeholder={rangeApplyLabelAll ? "공통 라벨 (선택)" : "라벨 개별 지정"}
                    value={rangeLabel}
                    onChange={(e) => setRangeLabel(e.target.value)}
                    disabled={!rangeApplyLabelAll}
                  />
                </div>
                <label className="row gap-6" style={{ fontSize: 12.5, color: "var(--mf)", cursor: "pointer", marginBottom: 8 }}>
                  <button
                    type="button"
                    className={cn("cbx", rangeApplyLabelAll && "on")}
                    onClick={() => setRangeApplyLabelAll((v) => !v)}
                    role="checkbox"
                    aria-checked={rangeApplyLabelAll}
                  />
                  모든 날짜에 같은 라벨 적용
                </label>
                <button
                  type="button"
                  className="btn sm primary"
                  onClick={addRange}
                  disabled={!rangeStart || !rangeEnd}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Plus size={12} strokeWidth={2} />
                  범위 전체 추가
                </button>
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              {/* 단일 추가 */}
              <div className="field">
                <label>단일 날짜 추가</label>
                <div className="os-grid grid-2" style={{ gap: 8, marginBottom: 8 }}>
                  <input className="input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <select className="select" value={newKind} onChange={(e) => setNewKind(e.target.value as Kind)}>
                    <option value="event">본행사</option>
                    <option value="practice">연습</option>
                  </select>
                </div>
                <input className="input" placeholder="레이블 (선택)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={{ marginBottom: 8 }} />
                <button type="button" className="btn sm" onClick={addSingle} disabled={!newDate} style={{ width: "100%", justifyContent: "center" }}>
                  <Plus size={12} strokeWidth={2} />
                  날짜 추가
                </button>
              </div>

              {/* 목록 */}
              {scheduleDates.length > 0 && (
                <>
                  <div className="row" style={{ justifyContent: "space-between", marginTop: 14, marginBottom: 6 }}>
                    <div className="mono text-xs muted" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      추가된 날짜 ({scheduleDates.length})
                    </div>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={clearAllDates}
                      style={{ color: "var(--danger, #b91c1c)" }}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                      전체 삭제
                    </button>
                  </div>
                  <div>
                    {scheduleDates.map((d) => (
                      <div
                        key={d.date}
                        className="row"
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                          gap: 8,
                        }}
                      >
                        <span className="mono text-xs" style={{ minWidth: 92 }}>{d.date}</span>
                        <select
                          className="select"
                          value={d.kind}
                          onChange={(e) => updateItem(d.date, { kind: e.target.value as Kind })}
                          style={{ maxWidth: 100, height: 28, padding: "2px 6px", fontSize: 12 }}
                        >
                          <option value="event">본행사</option>
                          <option value="practice">연습</option>
                        </select>
                        <input
                          className="input"
                          placeholder="라벨"
                          value={d.label}
                          onChange={(e) => updateItem(d.date, { label: e.target.value })}
                          style={{ flex: 1, height: 28, padding: "2px 8px", fontSize: 12 }}
                        />
                        <button type="button" className="btn ghost icon-only sm" onClick={() => removeDate(d.date)} aria-label="삭제">
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
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
