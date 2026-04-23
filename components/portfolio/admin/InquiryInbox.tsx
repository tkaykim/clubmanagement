"use client";

import { useState } from "react";
import { Loader2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import type { PortfolioInquiry, PortfolioInquiryStatus } from "@/lib/types";

interface InquiryInboxProps {
  initialInquiries: PortfolioInquiry[];
  initialTotal: number;
}

const STATUS_OPTIONS: { value: PortfolioInquiryStatus; label: string }[] = [
  { value: "new", label: "신규" },
  { value: "in_review", label: "검토중" },
  { value: "contacted", label: "연락완료" },
  { value: "closed", label: "종료" },
];

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  performance: "공연", broadcast: "방송", commercial: "CF·광고", workshop: "워크숍", other: "기타",
};


export function InquiryInbox({ initialInquiries }: InquiryInboxProps) {
  const [inquiries, setInquiries] = useState<PortfolioInquiry[]>(initialInquiries);
  const [filterStatus, setFilterStatus] = useState<PortfolioInquiryStatus | "all">("all");
  const [selectedInquiry, setSelectedInquiry] = useState<PortfolioInquiry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adminMemo, setAdminMemo] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = filterStatus === "all" ? inquiries : inquiries.filter((i) => i.status === filterStatus);

  const openInquiry = (inq: PortfolioInquiry) => {
    setSelectedInquiry(inq);
    setAdminMemo(inq.admin_memo || "");
    setSheetOpen(true);
  };

  const handleStatusChange = async (status: PortfolioInquiryStatus) => {
    if (!selectedInquiry) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/portfolio/inquiries/${selectedInquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = { ...selectedInquiry, status };
      setInquiries((prev) => prev.map((i) => i.id === selectedInquiry.id ? updated : i));
      setSelectedInquiry(updated);
      toast.success("상태가 업데이트되었습니다");
    } catch {
      toast.error("상태 변경에 실패했습니다");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveMemo = async () => {
    if (!selectedInquiry) return;
    setSavingMemo(true);
    try {
      const res = await fetch(`/api/portfolio/inquiries/${selectedInquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_memo: adminMemo }),
      });
      if (!res.ok) throw new Error();
      setInquiries((prev) => prev.map((i) => i.id === selectedInquiry.id ? { ...i, admin_memo: adminMemo } : i));
      toast.success("저장되었습니다");
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setSavingMemo(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInquiry) return;
    if (!confirm("정말 삭제하시겠어요?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/portfolio/inquiries/${selectedInquiry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setInquiries((prev) => prev.filter((i) => i.id !== selectedInquiry.id));
      setSheetOpen(false);
      toast.success("삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("클립보드에 복사되었습니다"));
  };

  const countByStatus = (s: PortfolioInquiryStatus) => inquiries.filter((i) => i.status === s).length;

  return (
    <>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${filterStatus === "all" ? "on" : ""}`} onClick={() => setFilterStatus("all")}>
          전체 <span className="count">{inquiries.length}</span>
        </button>
        {STATUS_OPTIONS.map((o) => (
          <button key={o.value} className={`tab ${filterStatus === o.value ? "on" : ""}`} onClick={() => setFilterStatus(o.value)}>
            {o.label} <span className="count">{countByStatus(o.value)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div>문의가 없습니다</div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-os)", overflow: "hidden" }}>
          {filtered.map((inq, i) => (
            <div
              key={inq.id}
              onClick={() => openInquiry(inq)}
              style={{
                padding: "14px 16px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <InquiryStatusBadge status={inq.status} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {inq.target_type === "team" ? "팀 전체" : "개인"} · {INQUIRY_TYPE_LABELS[inq.inquiry_type] || inq.inquiry_type}
                </div>
                <div style={{ fontSize: 12, color: "var(--mf)" }}>{inq.requester_name} {inq.requester_organization && `· ${inq.requester_organization}`}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--mf)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                {new Date(inq.created_at).toLocaleDateString("ko-KR")}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" style={{ maxWidth: 480, overflowY: "auto" }}>
          {selectedInquiry && (
            <>
              <SheetHeader>
                <SheetTitle>문의 상세</SheetTitle>
              </SheetHeader>
              <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <InquiryStatusBadge status={selectedInquiry.status} />
                  <span style={{ fontSize: 11, color: "var(--mf)", fontFamily: "var(--font-mono)" }}>
                    {new Date(selectedInquiry.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>

                <div className="field">
                  <label>상태 변경</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select className="select" value={selectedInquiry.status} onChange={(e) => handleStatusChange(e.target.value as PortfolioInquiryStatus)} disabled={savingStatus}>
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {savingStatus && <Loader2 size={14} className="animate-spin" />}
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                <dl className="kv">
                  <dt>대상</dt><dd>{selectedInquiry.target_type === "team" ? "팀 전체" : "개인"}</dd>
                  <dt>섭외 종류</dt><dd>{INQUIRY_TYPE_LABELS[selectedInquiry.inquiry_type] || selectedInquiry.inquiry_type}</dd>
                  <dt>이름</dt><dd>{selectedInquiry.requester_name}</dd>
                  {selectedInquiry.requester_organization && <><dt>소속</dt><dd>{selectedInquiry.requester_organization}</dd></>}
                  <dt>이메일</dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {selectedInquiry.requester_email}
                    <button type="button" className="btn icon-only sm ghost" onClick={() => copy(selectedInquiry.requester_email)} aria-label="이메일 복사">
                      <Copy size={12} />
                    </button>
                  </dd>
                  {selectedInquiry.requester_phone && (
                    <><dt>연락처</dt>
                    <dd style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {selectedInquiry.requester_phone}
                      <button type="button" className="btn icon-only sm ghost" onClick={() => copy(selectedInquiry.requester_phone!)} aria-label="연락처 복사">
                        <Copy size={12} />
                      </button>
                    </dd></>
                  )}
                  {selectedInquiry.region && <><dt>지역</dt><dd>{selectedInquiry.region}</dd></>}
                  {selectedInquiry.event_date_start && (
                    <><dt>희망 날짜</dt>
                    <dd>{selectedInquiry.event_date_start}{selectedInquiry.event_date_end && ` ~ ${selectedInquiry.event_date_end}`}</dd></>
                  )}
                  {selectedInquiry.event_time && <><dt>희망 시간</dt><dd>{selectedInquiry.event_time}</dd></>}
                  <dt>예산</dt>
                  <dd>
                    {selectedInquiry.budget_type === "fixed" && selectedInquiry.budget_amount
                      ? `고정 ${selectedInquiry.budget_amount.toLocaleString()}원`
                      : selectedInquiry.budget_type === "range" && selectedInquiry.budget_min
                      ? `${selectedInquiry.budget_min.toLocaleString()} ~ ${(selectedInquiry.budget_max || 0).toLocaleString()}원`
                      : "미정"}
                  </dd>
                </dl>

                <div style={{ height: 1, background: "var(--border)" }} />

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>상세 메시지</div>
                  <blockquote style={{ borderLeft: "3px solid var(--border-2)", paddingLeft: 12, margin: 0, fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {selectedInquiry.message}
                  </blockquote>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                <div className="field">
                  <label>관리자 메모</label>
                  <textarea className="textarea" rows={3} value={adminMemo} onChange={(e) => setAdminMemo(e.target.value)} placeholder="내부 메모..." />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                    <button className="btn ghost" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleting}>
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      삭제
                    </button>
                    <button className="btn primary" onClick={handleSaveMemo} disabled={savingMemo}>
                      {savingMemo && <Loader2 size={14} className="animate-spin" />}
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
