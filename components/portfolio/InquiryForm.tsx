"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { PublicCrewMember, PortfolioMediaWithMembers, PortfolioInquiryType, PortfolioInquiryBudgetType } from "@/lib/types";

interface InquiryFormProps {
  defaultTargetType: "team" | "member";
  defaultMemberId?: string;
  defaultReferenceMediaId?: string;
  defaultInquiryType?: PortfolioInquiryType;
  members: PublicCrewMember[];
  referenceMediaMap: Record<string, PortfolioMediaWithMembers>;
  onSuccess: () => void;
}

const INQUIRY_TYPES = [
  { value: "performance", label: "공연" },
  { value: "broadcast", label: "방송" },
  { value: "commercial", label: "CF·광고" },
  { value: "workshop", label: "워크숍" },
  { value: "other", label: "기타" },
] as const;

type FieldErrors = Partial<Record<string, string>>;

export function InquiryForm({
  defaultTargetType,
  defaultMemberId,
  defaultReferenceMediaId,
  defaultInquiryType,
  members,
  referenceMediaMap,
  onSuccess,
}: InquiryFormProps) {
  const [targetType, setTargetType] = useState<"team" | "member">(defaultTargetType);
  const [targetMemberId, setTargetMemberId] = useState<string>(defaultMemberId || "");
  const [referenceMediaId, setReferenceMediaId] = useState<string>(defaultReferenceMediaId || "");
  const [inquiryType, setInquiryType] = useState<string>(defaultInquiryType || "");
  const [requesterName, setRequesterName] = useState("");
  const [requesterOrg, setRequesterOrg] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [region, setRegion] = useState("");
  const [eventDateStart, setEventDateStart] = useState("");
  const [eventDateEnd, setEventDateEnd] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [budgetType, setBudgetType] = useState<PortfolioInquiryBudgetType>("tbd");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot

  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset to defaults when props change (dialog reopen)
  useEffect(() => {
    setTargetType(defaultTargetType);
    setTargetMemberId(defaultMemberId || "");
    setReferenceMediaId(defaultReferenceMediaId || "");
    setInquiryType(defaultInquiryType || "");
    setSuccess(false);
    setErrors({});
  }, [defaultTargetType, defaultMemberId, defaultReferenceMediaId, defaultInquiryType]);

  // Close member dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (m.stage_name || "").toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  });

  const selectedMember = members.find((m) => m.id === targetMemberId);
  const referenceMedia = referenceMediaId ? referenceMediaMap[referenceMediaId] : null;

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (targetType === "member" && !targetMemberId) e.targetMemberId = "멤버를 선택해주세요";
    if (!inquiryType) e.inquiryType = "섭외 종류를 선택해주세요";
    if (!requesterName.trim()) e.requesterName = "이름을 입력해주세요";
    if (!requesterEmail.trim()) e.requesterEmail = "이메일을 입력해주세요";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) e.requesterEmail = "올바른 이메일 주소를 입력해주세요";
    if (message.length < 10) e.message = "문의 내용을 10자 이상 입력해주세요";
    if (budgetType === "range" && budgetMin && budgetMax) {
      if (parseInt(budgetMin) > parseInt(budgetMax)) {
        e.budgetMax = "최대 예산은 최소 예산보다 커야 합니다";
      }
    }
    if (eventDateEnd && eventDateStart && eventDateEnd < eventDateStart) {
      e.eventDateEnd = "종료일은 시작일보다 늦어야 합니다";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("입력한 내용을 확인해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        _hp: hp,
        target_type: targetType,
        target_member_id: targetType === "member" && targetMemberId ? targetMemberId : null,
        reference_media_id: referenceMediaId || null,
        inquiry_type: inquiryType as PortfolioInquiryType,
        requester_name: requesterName.trim(),
        requester_organization: requesterOrg.trim() || null,
        requester_email: requesterEmail.trim(),
        requester_phone: requesterPhone.trim() || null,
        region: region.trim() || null,
        event_date_start: eventDateStart || null,
        event_date_end: eventDateEnd || null,
        event_time: eventTime.trim() || null,
        budget_type: budgetType,
        budget_amount: budgetType === "fixed" && budgetAmount ? parseInt(budgetAmount) : null,
        budget_min: budgetType === "range" && budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetType === "range" && budgetMax ? parseInt(budgetMax) : null,
        message: message.trim(),
      };

      const res = await fetch("/api/portfolio/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        setCooldown(5);
      } else {
        const json = await res.json().catch(() => ({}));
        if (res.status === 400 && Array.isArray(json.details)) {
          toast.error("입력한 내용을 확인해 주세요.");
          const newErrors: FieldErrors = {};
          for (const d of json.details) {
            if (d.path && d.path.length > 0) newErrors[d.path[0]] = d.message;
          }
          setErrors(newErrors);
        } else {
          toast.error("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
    } catch {
      toast.error("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--ok-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={24} style={{ color: "var(--ok)" }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>문의가 접수되었습니다</div>
        <div style={{ fontSize: 14, color: "var(--mf)" }}>담당자 확인 후 이메일로 연락 드리겠습니다.</div>
        <button className="btn primary" style={{ marginTop: 24 }} onClick={onSuccess}>확인</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* honeypot */}
      <input
        type="text"
        name="_hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
      />

      {/* SECTION 1: 문의 대상 */}
      <div className="field">
        <label>문의 대상 <span className="req">*</span></label>
        <div style={{ display: "flex", gap: 12 }}>
          {(["team", "member"] as const).map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5 }}>
              <input
                type="radio"
                name="targetType"
                value={t}
                checked={targetType === t}
                onChange={() => { setTargetType(t); setTargetMemberId(""); }}
              />
              {t === "team" ? "팀 전체" : "개인 멤버"}
            </label>
          ))}
        </div>
      </div>

      {targetType === "member" && (
        <div className="field" ref={memberDropdownRef} style={{ position: "relative" }}>
          <label>멤버 선택 <span className="req">*</span></label>
          <div
            role="combobox"
            aria-expanded={memberDropdownOpen}
            aria-haspopup="listbox"
            aria-controls="member-listbox"
            aria-label="섭외 대상 멤버 선택"
            className="input"
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", height: 38 }}
            onClick={() => setMemberDropdownOpen((o) => !o)}
          >
            {selectedMember ? (
              <span style={{ flex: 1 }}>{selectedMember.stage_name || selectedMember.name}</span>
            ) : (
              <span style={{ flex: 1, color: "var(--mf)" }}>멤버를 선택하세요</span>
            )}
          </div>
          {memberDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)", zIndex: 50, maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                <input
                  className="input"
                  placeholder="검색..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ height: 32, fontSize: 13 }}
                  autoFocus
                />
              </div>
              <ul id="member-listbox" role="listbox" aria-label="멤버 목록" style={{ margin: 0, padding: "4px 0", listStyle: "none", overflowY: "auto", flex: 1 }}>
                {filteredMembers.length === 0 ? (
                  <li style={{ padding: "8px 12px", fontSize: 13, color: "var(--mf)" }}>검색 결과가 없습니다</li>
                ) : filteredMembers.map((m) => (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={m.id === targetMemberId}
                    style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", background: m.id === targetMemberId ? "var(--muted)" : "transparent" }}
                    onClick={() => { setTargetMemberId(m.id); setMemberSearch(""); setMemberDropdownOpen(false); }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.background = "var(--muted)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.background = m.id === targetMemberId ? "var(--muted)" : "transparent"; }}
                  >
                    <span style={{ fontWeight: 600 }}>{m.stage_name || m.name}</span>
                    {m.position && <span style={{ marginLeft: 6, color: "var(--mf)", fontSize: 11.5 }}>{m.position}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errors.targetMemberId && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.targetMemberId}</small>}
        </div>
      )}

      {/* SECTION 2: 기본 정보 */}
      <div className="field">
        <label>섭외 종류 <span className="req">*</span></label>
        <select className="select" value={inquiryType} onChange={(e) => setInquiryType(e.target.value)}>
          <option value="">선택하세요</option>
          {INQUIRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {errors.inquiryType && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.inquiryType}</small>}
      </div>

      <div className="field">
        <label>이름 <span className="req">*</span></label>
        <input className="input" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="홍길동" />
        {errors.requesterName && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.requesterName}</small>}
      </div>

      <div className="field">
        <label>소속 기관 <span className="hint">선택</span></label>
        <input className="input" value={requesterOrg} onChange={(e) => setRequesterOrg(e.target.value)} placeholder="OO 기획사" />
      </div>

      <div className="field">
        <label>이메일 <span className="req">*</span></label>
        <input className="input" type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} placeholder="example@email.com" />
        {errors.requesterEmail && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.requesterEmail}</small>}
      </div>

      <div className="field">
        <label>연락처 <span className="hint">선택</span></label>
        <input className="input" type="tel" value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} placeholder="010-0000-0000" />
      </div>

      {/* SECTION 3: 행사 정보 */}
      <div className="field">
        <label>지역 <span className="hint">선택</span></label>
        <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="서울 강남구" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="field">
          <label>희망 날짜(시작)</label>
          <input className="input" type="date" value={eventDateStart} onChange={(e) => setEventDateStart(e.target.value)} />
        </div>
        <div className="field">
          <label>희망 날짜(끝)</label>
          <input className="input" type="date" value={eventDateEnd} onChange={(e) => setEventDateEnd(e.target.value)} min={eventDateStart || undefined} />
          {errors.eventDateEnd && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.eventDateEnd}</small>}
        </div>
      </div>

      <div className="field">
        <label>희망 시간 <span className="hint">선택</span></label>
        <input className="input" value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="예: 19:00~21:00" />
      </div>

      {/* SECTION 4: 예산 */}
      <div className="field">
        <label>예산</label>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          {(["tbd", "fixed", "range"] as const).map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13.5 }}>
              <input type="radio" name="budgetType" value={t} checked={budgetType === t} onChange={() => setBudgetType(t)} />
              {t === "tbd" ? "미정" : t === "fixed" ? "고정 예산" : "범위 예산"}
            </label>
          ))}
        </div>
        {budgetType === "fixed" && (
          <input className="input" type="number" min={0} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder="금액 (원)" />
        )}
        {budgetType === "range" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input className="input" type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="최소 (원)" />
              <span style={{ color: "var(--mf)" }}>~</span>
              <input className="input" type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="최대 (원)" />
            </div>
            {errors.budgetMax && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.budgetMax}</small>}
          </>
        )}
      </div>

      {/* SECTION 5: 레퍼런스 */}
      {referenceMedia && (
        <div className="field">
          <label>레퍼런스 영상</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)" }}>
            <div style={{ fontSize: 13, flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{referenceMedia.title || "영상"}</span>
              <span style={{ color: "var(--mf)", marginLeft: 6, fontSize: 11 }}>이 영상을 레퍼런스로 문의합니다</span>
            </div>
            <button
              type="button"
              onClick={() => setReferenceMediaId("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mf)", padding: 4 }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 6: 상세 메시지 */}
      <div className="field">
        <label>상세 메시지 <span className="req">*</span></label>
        <div style={{ position: "relative" }}>
          <textarea
            className="textarea"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="행사 상세 내용, 특별한 요청사항 등을 작성해주세요 (최소 10자)"
            readOnly={submitting}
          />
          <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "var(--mf)", fontFamily: "var(--font-mono)" }}>
            {message.length}/4000
          </div>
        </div>
        {errors.message && <small style={{ color: "var(--danger)", fontSize: 11 }}>{errors.message}</small>}
      </div>

      <button
        type="submit"
        className="btn primary lg w-full"
        disabled={submitting || cooldown > 0}
        style={{ justifyContent: "center", marginTop: 8 }}
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" style={{ marginRight: 6 }} />전송 중...</>
        ) : cooldown > 0 ? (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{cooldown}초 후 재시도 가능</span>
        ) : (
          "문의 전송"
        )}
      </button>
    </form>
  );
}
