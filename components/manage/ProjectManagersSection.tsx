"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Shield, Trash2, Loader2, Check } from "lucide-react";
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
 * 운영진이 이 프로젝트의 '프로젝트 관리자'(읽기전용)를 지정/해제하는 버튼 + 모달.
 * /manage/projects/[id] 헤더에 버튼 하나로 노출 (서버 페이지가 admin/owner 게이트).
 */
export function ProjectManagersSection({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch(`/api/manage/projects/${projectId}/managers`);
    const json = await res.json();
    if (res.ok) setManagers((json.data ?? []) as Manager[]);
    setLoaded(true);
  }

  // 버튼 카운트 표시용으로 처음 한 번 미리 로드
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // 모달 열릴 때 멤버 후보 로드 (가입 계정 연결된 활성 멤버만)
  useEffect(() => {
    if (!open || crewOptions.length > 0) return;
    supabase
      .from("crew_members")
      .select("id, name, stage_name, user_id")
      .eq("is_active", true)
      .not("user_id", "is", null)
      .order("name")
      .then(({ data }) => setCrewOptions((data ?? []) as CrewOption[]));
  }, [open, crewOptions.length]);

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
    if (!res.ok) toast.error(json.error ?? "지정에 실패했습니다");
    else {
      toast.success("프로젝트 관리자로 지정했습니다");
      setQuery("");
      await load();
    }
    setAdding(false);
  }

  async function unassign(managerId: string) {
    setBusyId(managerId);
    const res = await fetch(`/api/manage/projects/${projectId}/managers/${managerId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) toast.error(json.error ?? "해제에 실패했습니다");
    else {
      toast.success("해제했습니다");
      setManagers((prev) => prev.filter((m) => m.id !== managerId));
    }
    setBusyId(null);
  }

  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)} title="프로젝트 관리자 지정">
        <Shield size={14} strokeWidth={2} />
        관리자 지정
        {loaded && managers.length > 0 && (
          <span className="badge" style={{ marginLeft: 2 }}>{managers.length}</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>프로젝트 관리자</DialogTitle>
            <DialogDescription>
              지정된 멤버는 이 프로젝트의 지원자현황·일정을 읽기전용으로 볼 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 현재 지정자 */}
          {managers.length === 0 ? (
            <div className="empty" style={{ fontSize: 13, padding: 12 }}>
              지정된 관리자가 없습니다
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

          {/* 멤버 추가 */}
          <div className="field" style={{ marginTop: 8 }}>
            <label>멤버 검색해서 추가</label>
            <input
              className="input"
              placeholder="이름 또는 활동명"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div
              style={{
                marginTop: 8,
                maxHeight: 240,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              {filtered.length === 0 ? (
                <div className="empty" style={{ padding: 16, fontSize: 13 }}>결과가 없습니다</div>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
