"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Check, X, Mail, Phone, Loader2, Plus, Pencil, Trash2, Save } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

import type { MemberKind } from "@/lib/utils";

export type Applicant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  kind: MemberKind;
};

type CrewOption = { id: string; name: string; stage_name: string | null; user_id: string | null };

function formatDateTime(d: string): string {
  const date = new Date(d);
  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

type EditState = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export function ApplicantList({
  applicants: initial,
  projectId,
}: {
  applicants: Applicant[];
  projectId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"member" | "guest">("member");
  const [memberQuery, setMemberQuery] = useState("");
  const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [addStatus, setAddStatus] = useState<"approved" | "pending">("approved");
  const [creating, setCreating] = useState(false);

  const addFormRef = useRef<HTMLDivElement>(null);

  // 크루 멤버 목록 프리로드 — 멤버 선택용 자동완성
  useEffect(() => {
    if (!showAdd || addMode !== "member" || crewOptions.length > 0) return;
    supabase
      .from("crew_members")
      .select("id, name, stage_name, user_id")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setCrewOptions((data ?? []) as CrewOption[]);
      });
  }, [showAdd, addMode, crewOptions.length]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return crewOptions.slice(0, 30);
    return crewOptions
      .filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.stage_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [crewOptions, memberQuery]);

  async function updateStatus(appId: string, status: string) {
    setUpdatingId(appId);
    const res = await fetch(
      `/api/manage/projects/${projectId}/participants/${appId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "상태 변경에 실패했습니다");
    } else {
      toast.success("상태가 변경되었습니다");
      startTransition(() => router.refresh());
    }
    setUpdatingId(null);
  }

  async function saveEdit() {
    if (!edit) return;
    setUpdatingId(edit.id);
    const res = await fetch(
      `/api/manage/projects/${projectId}/participants/${edit.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: edit.name.trim() || null,
          guest_email: edit.email.trim() || null,
          guest_phone: edit.phone.trim() || null,
        }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "수정 실패");
    } else {
      toast.success("수정되었습니다");
      setEdit(null);
      startTransition(() => router.refresh());
    }
    setUpdatingId(null);
  }

  async function removeApplicant(appId: string) {
    if (!confirm("이 참여자를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    setUpdatingId(appId);
    const res = await fetch(
      `/api/manage/projects/${projectId}/participants/${appId}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "삭제 실패");
    } else {
      toast.success("삭제되었습니다");
      startTransition(() => router.refresh());
    }
    setUpdatingId(null);
  }

  async function createParticipant() {
    if (addMode === "member" && !selectedMemberId) {
      toast.error("멤버를 선택해주세요");
      return;
    }
    if (addMode === "guest" && !guestName.trim()) {
      toast.error("게스트 이름을 입력해주세요");
      return;
    }
    setCreating(true);
    const payload =
      addMode === "member"
        ? { crew_member_id: selectedMemberId, status: addStatus }
        : {
            guest_name: guestName.trim(),
            guest_email: guestEmail.trim() || null,
            guest_phone: guestPhone.trim() || null,
            status: addStatus,
          };
    const res = await fetch(`/api/manage/projects/${projectId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "추가 실패");
    } else {
      toast.success("참여자가 추가되었습니다");
      setShowAdd(false);
      setSelectedMemberId(null);
      setMemberQuery("");
      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
      setAddStatus("approved");
      startTransition(() => router.refresh());
    }
    setCreating(false);
  }

  return (
    <>
      {/* 툴바 */}
      <div className="row mb-12" style={{ justifyContent: "flex-end" }}>
        <button
          className="btn primary"
          onClick={() => {
            setShowAdd(v => !v);
            if (showAdd) addFormRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {showAdd ? <X size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
          {showAdd ? "취소" : "참여자 추가"}
        </button>
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <div ref={addFormRef} className="card mb-16">
          <div className="card-head">
            <h3>참여자 추가</h3>
          </div>
          <div style={{ padding: 18 }}>
            {/* 모드 스위치 */}
            <div className="tabs mb-12">
              <button
                className={`tab ${addMode === "member" ? "on" : ""}`}
                onClick={() => setAddMode("member")}
                type="button"
              >
                플랫폼 멤버
              </button>
              <button
                className={`tab ${addMode === "guest" ? "on" : ""}`}
                onClick={() => setAddMode("guest")}
                type="button"
              >
                외부(게스트)
              </button>
            </div>

            {addMode === "member" ? (
              <div className="field mb-12">
                <label>멤버 검색</label>
                <input
                  className="input"
                  placeholder="이름 또는 활동명으로 검색"
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                />
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 220,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  {filteredMembers.length === 0 ? (
                    <div className="empty" style={{ padding: 16, fontSize: 13 }}>
                      결과가 없습니다
                    </div>
                  ) : (
                    filteredMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMemberId(m.id)}
                        style={{
                          display: "flex",
                          width: "100%",
                          padding: "10px 12px",
                          textAlign: "left",
                          alignItems: "center",
                          gap: 8,
                          background: selectedMemberId === m.id ? "var(--muted)" : "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                        {m.stage_name && (
                          <span className="mono text-xs muted">{m.stage_name}</span>
                        )}
                        {selectedMemberId === m.id && (
                          <Check size={14} strokeWidth={2.5} style={{ marginLeft: "auto" }} />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="os-grid grid-2 mb-12">
                <div className="field">
                  <label>
                    이름 <span className="req">*</span>
                  </label>
                  <input
                    className="input"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="예: 홍길동"
                  />
                </div>
                <div className="field">
                  <label>이메일</label>
                  <input
                    className="input"
                    type="email"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>연락처</label>
                  <input
                    className="input"
                    type="tel"
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="field mb-12">
              <label>초기 상태</label>
              <select
                className="select"
                value={addStatus}
                onChange={e => setAddStatus(e.target.value as "approved" | "pending")}
              >
                <option value="approved">확정</option>
                <option value="pending">대기</option>
              </select>
            </div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn primary"
                onClick={createParticipant}
                disabled={creating}
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {initial.length === 0 ? (
        <div className="card">
          <div className="empty">아직 지원자가 없습니다</div>
        </div>
      ) : (
        <div className="card flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>이름</th>
                <th>연락처</th>
                <th>상태</th>
                <th>지원일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {initial.map((a, idx) => {
                const isEditing = edit?.id === a.id;
                return (
                  <tr key={a.id}>
                    <td data-label="#" className="mono text-xs muted">
                      {idx + 1}
                    </td>
                    <td data-label="이름" style={{ fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          className="input"
                          value={edit.name}
                          onChange={e => setEdit({ ...edit, name: e.target.value })}
                          style={{ maxWidth: 180 }}
                        />
                      ) : (
                        <div className="row gap-6" style={{ flexWrap: "wrap" }}>
                          <span>{a.name}</span>
                          <StatusBadge status={a.kind} />
                        </div>
                      )}
                    </td>
                    <td data-label="연락처">
                      {isEditing ? (
                        <div className="row gap-4" style={{ flexDirection: "column", alignItems: "stretch" }}>
                          <input
                            className="input"
                            placeholder="이메일"
                            value={edit.email}
                            onChange={e => setEdit({ ...edit, email: e.target.value })}
                            style={{ fontSize: 12 }}
                          />
                          <input
                            className="input"
                            placeholder="연락처"
                            value={edit.phone}
                            onChange={e => setEdit({ ...edit, phone: e.target.value })}
                            style={{ fontSize: 12 }}
                          />
                        </div>
                      ) : (
                        <>
                          {a.email && (
                            <div className="row gap-4" style={{ fontSize: 12, color: "var(--mf)" }}>
                              <Mail size={11} strokeWidth={2} />
                              {a.email}
                            </div>
                          )}
                          {a.phone && (
                            <div className="row gap-4" style={{ fontSize: 12, color: "var(--mf)" }}>
                              <Phone size={11} strokeWidth={2} />
                              {a.phone}
                            </div>
                          )}
                          {!a.email && !a.phone && <span style={{ color: "var(--mf-2)" }}>—</span>}
                        </>
                      )}
                    </td>
                    <td data-label="상태">
                      <StatusBadge status={a.status} />
                    </td>
                    <td data-label="지원일" className="mono text-xs muted">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td data-label="액션">
                      {updatingId === a.id ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: "var(--mf)" }} />
                      ) : isEditing ? (
                        <div className="row gap-6">
                          <button
                            className="btn sm icon-only"
                            onClick={saveEdit}
                            title="저장"
                          >
                            <Save size={12} strokeWidth={2.5} />
                          </button>
                          <button
                            className="btn sm icon-only ghost"
                            onClick={() => setEdit(null)}
                            title="취소"
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="row gap-6">
                          <button
                            className="btn sm icon-only ghost"
                            style={a.status === "approved" ? { background: "var(--ok)", color: "#fff" } : {}}
                            onClick={() => updateStatus(a.id, "approved")}
                            title="확정"
                          >
                            <Check size={12} strokeWidth={2.5} />
                          </button>
                          <button
                            className="btn sm icon-only ghost danger"
                            style={a.status === "rejected" ? { background: "var(--danger)", color: "#fff" } : {}}
                            onClick={() => updateStatus(a.id, "rejected")}
                            title="거절"
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                          <button
                            className="btn sm icon-only ghost"
                            onClick={() =>
                              setEdit({
                                id: a.id,
                                name: a.name,
                                email: a.email ?? "",
                                phone: a.phone ?? "",
                              })
                            }
                            title="수정"
                          >
                            <Pencil size={12} strokeWidth={2.5} />
                          </button>
                          <button
                            className="btn sm icon-only ghost danger"
                            onClick={() => removeApplicant(a.id)}
                            title="삭제"
                          >
                            <Trash2 size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
