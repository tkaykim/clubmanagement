"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OsAvatar } from "@/components/ui/OsAvatar";
import { Plus, X, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type MemberRow = {
  id: string;
  user_id: string | null;
  name: string;
  stage_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  position: string | null;
  contract_type: string;
  is_active: boolean;
  joined_month: string | null;
};

const ROLE_ORDER: Record<UserRole, number> = { owner: 0, admin: 1, member: 2 };

export default function ManageMembersPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "pending" ? "pending" : "active";
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [tab, setTab] = useState<"active" | "pending">(initialTab);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", position: "", contract_type: "contract" });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("crew_members")
      .select("id, user_id, name, stage_name, email, phone, role, position, contract_type, is_active, joined_month")
      .order("joined_at");
    setMembers((data ?? []) as MemberRow[]);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: me } = await supabase.from("crew_members").select("role").eq("user_id", user.id).maybeSingle();
        if (me) setCurrentRole(me.role as UserRole);
      }
      await fetchMembers();
      setLoading(false);
    }
    init();
  }, [fetchMembers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name.trim(), email: formData.email || null, phone: formData.phone || null, position: formData.position || null, contract_type: formData.contract_type, role: "member" }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error); } else {
        toast.success("멤버가 추가되었습니다");
        setShowForm(false);
        setFormData({ name: "", email: "", phone: "", position: "", contract_type: "contract" });
        fetchMembers();
      }
    } catch { toast.error("오류가 발생했습니다"); } finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const json = await res.json();
    if (json.error) toast.error(json.error);
    else toast.success("승인되었습니다");
    await fetchMembers();
    setActionLoading(null);
  };

  const handleDeactivate = async (id: string) => {
    setActionLoading(id);
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate" }),
    });
    const json = await res.json();
    if (json.error) toast.error(json.error);
    else toast.success("비활성화되었습니다");
    await fetchMembers();
    setActionLoading(null);
  };

  const handleToggleAdmin = async (m: MemberRow) => {
    setActionLoading(m.id);
    const newRole: UserRole = m.role === "admin" ? "member" : "admin";
    const res = await fetch(`/api/members/${m.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const json = await res.json();
    if (json.error) toast.error(json.error);
    else { toast.success("역할이 변경되었습니다"); fetchMembers(); }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    setActionLoading(id);
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.error) toast.error(json.error);
    else toast.success("삭제되었습니다");
    await fetchMembers();
    setActionLoading(null);
  };

  const activeMembers = members.filter(m => m.is_active).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const pendingMembers = members.filter(m => !m.is_active);
  const displayMembers = tab === "active" ? activeMembers : pendingMembers;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>멤버 관리</h1>
          <div className="sub">활성 {activeMembers.length}명 · 대기 {pendingMembers.length}명</div>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
            {showForm ? "취소" : "멤버 추가"}
          </button>
        )}
      </div>

      {/* 탭 */}
      <nav className="tabs" style={{ marginBottom: 20 }}>
        <button className={cn("tab", tab === "active" && "on")} onClick={() => setTab("active")}>
          활성 멤버 <span className="count">{activeMembers.length}</span>
        </button>
        <button className={cn("tab", tab === "pending" && "on")} onClick={() => setTab("pending")}>
          승인 대기 {pendingMembers.length > 0 && <span className="count" style={{ background: "var(--warn)", color: "#fff" }}>{pendingMembers.length}</span>}
        </button>
      </nav>

      {/* 추가 폼 */}
      {showForm && tab === "active" && (
        <div className="card mb-16">
          <div className="card-head"><h3>새 멤버</h3></div>
          <form onSubmit={handleAdd} style={{ padding: 18 }}>
            <div className="os-grid grid-2">
              <div className="field">
                <label>이름 <span className="req">*</span></label>
                <input className="input" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} required />
              </div>
              <div className="field">
                <label>이메일</label>
                <input className="input" type="email" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div className="field">
                <label>연락처</label>
                <input className="input" type="tel" value={formData.phone} onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} />
              </div>
              <div className="field">
                <label>포지션</label>
                <input className="input" placeholder="리더, 퍼포머 등" value={formData.position} onChange={e => setFormData(d => ({ ...d, position: e.target.value }))} />
              </div>
              <div className="field">
                <label>계약 유형</label>
                <select className="select" value={formData.contract_type} onChange={e => setFormData(d => ({ ...d, contract_type: e.target.value }))}>
                  <option value="contract">계약</option>
                  <option value="non_contract">비계약</option>
                  <option value="guest">게스트</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin" />}
                추가
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--mf)" }} />
        </div>
      ) : displayMembers.length === 0 ? (
        <div className="card">
          <div className="empty">
            {tab === "active" ? "활성 멤버가 없어요" : "승인 대기 멤버가 없어요"}
          </div>
        </div>
      ) : (
        <div className="card flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>멤버</th>
                <th>역할</th>
                <th>계약</th>
                <th>포지션</th>
                <th>합류</th>
                {isAdmin && <th>액션</th>}
              </tr>
            </thead>
            <tbody>
              {displayMembers.map(m => (
                <tr key={m.id}>
                  <td data-label="멤버">
                    <div className="row gap-10">
                      <OsAvatar name={m.name} size="default" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                        {m.stage_name && <div className="mono text-xs muted">{m.stage_name}</div>}
                        {m.email && <div style={{ fontSize: 11.5, color: "var(--mf)" }}>{m.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td data-label="역할"><StatusBadge status={m.role} /></td>
                  <td data-label="계약"><StatusBadge status={m.contract_type} /></td>
                  <td data-label="포지션"><span style={{ fontSize: 13 }}>{m.position ?? "—"}</span></td>
                  <td data-label="합류" className="mono text-xs muted">{m.joined_month ?? "—"}</td>
                  {isAdmin && m.role !== "owner" && (
                    <td data-label="액션">
                      <div className="row gap-6">
                        {!m.is_active ? (
                          <button className="btn sm primary" onClick={() => handleApprove(m.id)} disabled={actionLoading === m.id}>
                            <UserCheck size={12} strokeWidth={2} />
                            승인
                          </button>
                        ) : (
                          <>
                            {isOwner && (
                              <button
                                className="btn sm icon-only ghost"
                                onClick={() => handleToggleAdmin(m)}
                                disabled={actionLoading === m.id}
                                title={m.role === "admin" ? "멤버로 변경" : "운영진으로 변경"}
                              >
                                {m.role === "admin" ? <ShieldOff size={13} strokeWidth={2} /> : <ShieldCheck size={13} strokeWidth={2} />}
                              </button>
                            )}
                            <button className="btn sm icon-only ghost" onClick={() => handleDeactivate(m.id)} disabled={actionLoading === m.id} title="비활성화">
                              <UserX size={13} strokeWidth={2} />
                            </button>
                            {isOwner && (
                              <button className="btn sm icon-only ghost danger" onClick={() => handleDelete(m.id)} disabled={actionLoading === m.id} title="삭제">
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  {isAdmin && m.role === "owner" && <td data-label="액션" />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
