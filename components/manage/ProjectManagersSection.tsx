"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Plus, X, Trash2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type Manager = {
  id: string;
  user_id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
};

type CrewOption = { id: string; name: string; stage_name: string | null; user_id: string | null };

/**
 * 운영진이 특정 멤버를 이 프로젝트의 '프로젝트 관리자'(읽기전용)로 지정/해제하는 섹션.
 * /manage/projects/[id] 에서만 노출 (서버 페이지가 admin/owner 게이트).
 */
export function ProjectManagersSection({ projectId }: { projectId: string }) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch(`/api/manage/projects/${projectId}/managers`);
    const json = await res.json();
    if (res.ok) setManagers((json.data ?? []) as Manager[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // 가입 계정이 연결된 활성 멤버만 관리자로 지정 가능
  useEffect(() => {
    if (!showAdd || crewOptions.length > 0) return;
    supabase
      .from("crew_members")
      .select("id, name, stage_name, user_id")
      .eq("is_active", true)
      .not("user_id", "is", null)
      .order("name")
      .then(({ data }) => setCrewOptions((data ?? []) as CrewOption[]));
  }, [showAdd, crewOptions.length]);

  const assignedUserIds = useMemo(() => new Set(managers.map((m) => m.user_id)), [managers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return crewOptions
      .filter((m) => !assignedUserIds.has(m.user_id ?? ""))
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          (m.stage_name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [crewOptions, query, assignedUserIds]);

  async function assign(crewMemberId: string) {
    setAdding(true);
    const res = await fetch(`/api/manage/projects/${projectId}/managers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew_member_id: crewMemberId }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "지정에 실패했습니다");
    } else {
      toast.success("프로젝트 관리자로 지정했습니다");
      setQuery("");
      setShowAdd(false);
      await load();
    }
    setAdding(false);
  }

  async function unassign(managerId: string) {
    if (!confirm("이 멤버의 프로젝트 관리자 권한을 해제할까요?")) return;
    setBusyId(managerId);
    const res = await fetch(`/api/manage/projects/${projectId}/managers/${managerId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "해제에 실패했습니다");
    } else {
      toast.success("해제했습니다");
      setManagers((prev) => prev.filter((m) => m.id !== managerId));
    }
    setBusyId(null);
  }

  return (
    <div className="card mb-16">
      <div className="card-head row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row gap-6" style={{ alignItems: "center" }}>
          <Shield size={15} strokeWidth={2} />
          <h3>프로젝트 관리자</h3>
          <span className="text-xs muted">지원자현황·일정을 읽기전용으로 볼 수 있는 멤버</span>
        </div>
        <button className="btn sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? <X size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
          {showAdd ? "닫기" : "지정"}
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {showAdd && (
          <div className="mb-12">
            <input
              className="input"
              placeholder="이름 또는 활동명으로 멤버 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
              {filtered.length === 0 ? (
                <div className="empty" style={{ padding: 16, fontSize: 13 }}>
                  결과가 없습니다
                </div>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={adding}
                    onClick={() => assign(m.id)}
                    style={{
                      display: "flex",
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      alignItems: "center",
                      gap: 8,
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                    {m.stage_name && <span className="mono text-xs muted">{m.stage_name}</span>}
                    {adding ? (
                      <Loader2 size={14} className="animate-spin" style={{ marginLeft: "auto" }} />
                    ) : (
                      <Check size={14} strokeWidth={2.5} style={{ marginLeft: "auto", color: "var(--mf-2)" }} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="row gap-6 muted" style={{ fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" /> 불러오는 중…
          </div>
        ) : managers.length === 0 ? (
          <div className="empty" style={{ fontSize: 13 }}>
            지정된 프로젝트 관리자가 없습니다
          </div>
        ) : (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {managers.map((m) => (
              <div
                key={m.id}
                className="row gap-6"
                style={{
                  alignItems: "center",
                  padding: "6px 8px 6px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600 }}>{m.name}</span>
                <button
                  className="btn sm icon-only ghost danger"
                  onClick={() => unassign(m.id)}
                  disabled={busyId === m.id}
                  title="해제"
                >
                  {busyId === m.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
