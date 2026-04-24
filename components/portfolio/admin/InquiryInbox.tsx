"use client";

import { useState } from "react";
import { Loader2, Copy, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import type { PortfolioInquiry, PortfolioInquiryStatus } from "@/lib/types";

export type InquiryWithRefs = PortfolioInquiry & {
  target_member?: { id: string; stage_name: string | null; name: string } | null;
  reference_media?: {
    id: string;
    title: string | null;
    youtube_url: string | null;
    thumbnail_url: string | null;
  } | null;
};

interface InquiryInboxProps {
  initialInquiries: InquiryWithRefs[];
  initialTotal: number;
}

const STATUS_OPTIONS: { value: PortfolioInquiryStatus; label: string }[] = [
  { value: "new", label: "신규" },
  { value: "in_review", label: "검토중" },
  { value: "contacted", label: "연락완료" },
  { value: "on_hold", label: "보류" },
  { value: "closed", label: "완료" },
];

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  performance: "공연",
  broadcast: "방송",
  commercial: "CF·광고",
  workshop: "워크숍",
  other: "기타",
};

const BUDGET_TYPE_LABELS: Record<string, string> = {
  fixed: "고정 예산",
  range: "범위 예산",
  tbd: "미정",
};

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("ko-KR");
}

function formatBudget(inq: PortfolioInquiry): string {
  if (inq.budget_type === "fixed") {
    return inq.budget_amount != null ? `고정 ${fmt(inq.budget_amount)} 원` : "고정 (미기재)";
  }
  if (inq.budget_type === "range") {
    if (inq.budget_min != null || inq.budget_max != null) {
      return `범위 ${fmt(inq.budget_min)} ~ ${fmt(inq.budget_max)} 원`;
    }
    return "범위 (미기재)";
  }
  return "미정";
}

export function InquiryInbox({ initialInquiries }: InquiryInboxProps) {
  const [inquiries, setInquiries] = useState<InquiryWithRefs[]>(initialInquiries);
  const [filterStatus, setFilterStatus] = useState<PortfolioInquiryStatus | "all">("all");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryWithRefs | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adminMemo, setAdminMemo] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered =
    filterStatus === "all" ? inquiries : inquiries.filter((i) => i.status === filterStatus);

  const openInquiry = (inq: InquiryWithRefs) => {
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
      setInquiries((prev) => prev.map((i) => (i.id === selectedInquiry.id ? updated : i)));
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
      setInquiries((prev) =>
        prev.map((i) => (i.id === selectedInquiry.id ? { ...i, admin_memo: adminMemo } : i))
      );
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
      const res = await fetch(`/api/portfolio/inquiries/${selectedInquiry.id}`, {
        method: "DELETE",
      });
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
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("클립보드에 복사되었습니다"));
  };

  const countByStatus = (s: PortfolioInquiryStatus) =>
    inquiries.filter((i) => i.status === s).length;

  const memberLabel = (inq: InquiryWithRefs): string => {
    if (inq.target_type === "team") return "팀 전체";
    if (inq.target_member) {
      const tm = inq.target_member;
      return tm.stage_name ? `${tm.stage_name} (${tm.name})` : tm.name;
    }
    if (inq.target_member_id) return `ID ${inq.target_member_id}`;
    return "개인 (멤버 미지정)";
  };

  return (
    <>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${filterStatus === "all" ? "on" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          전체 <span className="count">{fmt(inquiries.length)}</span>
        </button>
        {STATUS_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={`tab ${filterStatus === o.value ? "on" : ""}`}
            onClick={() => setFilterStatus(o.value)}
          >
            {o.label} <span className="count">{fmt(countByStatus(o.value))}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div>문의가 없습니다</div>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-os)",
            overflow: "hidden",
          }}
        >
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
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "var(--muted)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              <InquiryStatusBadge status={inq.status} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inq.title || "(제목 없음)"}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--mf)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {INQUIRY_TYPE_LABELS[inq.inquiry_type] || inq.inquiry_type} ·{" "}
                  {memberLabel(inq)} · {inq.requester_name}
                  {inq.requester_organization ? ` (${inq.requester_organization})` : ""}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--mf)",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                {new Date(inq.created_at).toLocaleDateString("ko-KR")}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          style={{
            width: "min(560px, 100vw)",
            maxWidth: "100vw",
            overflowY: "auto",
          }}
        >
          {selectedInquiry && (
            <>
              <SheetHeader>
                <SheetTitle
                  style={{
                    wordBreak: "break-word",
                    lineHeight: 1.4,
                  }}
                >
                  {selectedInquiry.title || "(제목 없음)"}
                </SheetTitle>
              </SheetHeader>
              <div
                style={{
                  padding: "16px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <InquiryStatusBadge status={selectedInquiry.status} />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--mf)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    접수: {new Date(selectedInquiry.created_at).toLocaleString("ko-KR")}
                  </span>
                  {selectedInquiry.updated_at &&
                    selectedInquiry.updated_at !== selectedInquiry.created_at && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--mf)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        수정: {new Date(selectedInquiry.updated_at).toLocaleString("ko-KR")}
                      </span>
                    )}
                </div>

                <div className="field">
                  <label>상태 변경</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      className="select"
                      value={selectedInquiry.status}
                      onChange={(e) =>
                        handleStatusChange(e.target.value as PortfolioInquiryStatus)
                      }
                      disabled={savingStatus}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {savingStatus && <Loader2 size={14} className="animate-spin" />}
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                <dl className="kv">
                  <dt>제목</dt>
                  <dd style={{ wordBreak: "break-word" }}>
                    {selectedInquiry.title || "-"}
                  </dd>

                  <dt>문의 대상</dt>
                  <dd>{memberLabel(selectedInquiry)}</dd>

                  <dt>섭외 종류</dt>
                  <dd>
                    {INQUIRY_TYPE_LABELS[selectedInquiry.inquiry_type] ||
                      selectedInquiry.inquiry_type}
                  </dd>

                  <dt>이름</dt>
                  <dd>{selectedInquiry.requester_name}</dd>

                  <dt>소속</dt>
                  <dd>{selectedInquiry.requester_organization || "-"}</dd>

                  <dt>이메일</dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 6, wordBreak: "break-all" }}>
                    {selectedInquiry.requester_email}
                    <button
                      type="button"
                      className="btn icon-only sm ghost"
                      onClick={() => copy(selectedInquiry.requester_email)}
                      aria-label="이메일 복사"
                    >
                      <Copy size={12} />
                    </button>
                  </dd>

                  <dt>연락처</dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {selectedInquiry.requester_phone || "-"}
                    {selectedInquiry.requester_phone && (
                      <button
                        type="button"
                        className="btn icon-only sm ghost"
                        onClick={() => copy(selectedInquiry.requester_phone!)}
                        aria-label="연락처 복사"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </dd>

                  <dt>지역</dt>
                  <dd>{selectedInquiry.region || "-"}</dd>

                  <dt>희망 날짜</dt>
                  <dd>
                    {selectedInquiry.event_date_start
                      ? `${selectedInquiry.event_date_start}${
                          selectedInquiry.event_date_end
                            ? ` ~ ${selectedInquiry.event_date_end}`
                            : ""
                        }`
                      : "-"}
                  </dd>

                  <dt>희망 시간</dt>
                  <dd>{selectedInquiry.event_time || "-"}</dd>

                  <dt>예산 유형</dt>
                  <dd>
                    {BUDGET_TYPE_LABELS[selectedInquiry.budget_type] ||
                      selectedInquiry.budget_type}
                  </dd>

                  <dt>예산</dt>
                  <dd>{formatBudget(selectedInquiry)}</dd>

                  <dt>레퍼런스 영상</dt>
                  <dd>
                    {selectedInquiry.reference_media ? (
                      <a
                        href={selectedInquiry.reference_media.youtube_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--fg)",
                          textDecoration: "underline",
                        }}
                      >
                        {selectedInquiry.reference_media.title || "영상 링크"}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </dl>

                <div style={{ height: 1, background: "var(--border)" }} />

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    상세 메시지
                  </div>
                  <blockquote
                    style={{
                      borderLeft: "3px solid var(--border-2)",
                      paddingLeft: 12,
                      margin: 0,
                      fontSize: 13,
                      color: "var(--fg-soft)",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {selectedInquiry.message}
                  </blockquote>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                <div className="field">
                  <label>관리자 메모</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={adminMemo}
                    onChange={(e) => setAdminMemo(e.target.value)}
                    placeholder="내부 메모..."
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <button
                      className="btn ghost"
                      style={{ color: "var(--danger)" }}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      삭제
                    </button>
                    <button
                      className="btn primary"
                      onClick={handleSaveMemo}
                      disabled={savingMemo}
                    >
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
