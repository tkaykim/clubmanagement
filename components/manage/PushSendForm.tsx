"use client";

import { useMemo, useState } from "react";
import { Send, Bell, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export type MemberOption = {
  id: string;
  user_id: string;
  name: string;
  stage_name: string | null;
  role: string;
};

export type ProjectOption = {
  id: string;
  title: string;
  status: string;
};

export type AnnouncementOption = {
  id: string;
  title: string;
  pinned: boolean;
  created_at: string;
};

type TargetKind = "all" | "self" | "users" | "role" | "project";
type LinkKind = "none" | "project" | "announcement" | "url";

interface Props {
  members: MemberOption[];
  projects: ProjectOption[];
  announcements: AnnouncementOption[];
  subscribedUserIds: string[];
}

const ROLE_LABELS: Record<string, string> = {
  owner: "오너",
  admin: "운영진",
  member: "일반 멤버",
};

export function PushSendForm({ members, projects, announcements, subscribedUserIds }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<TargetKind>("self");
  const [pickedUsers, setPickedUsers] = useState<Set<string>>(new Set());
  const [pickedRole, setPickedRole] = useState<"admin" | "owner" | "member">("member");
  const [pickedProjectId, setPickedProjectId] = useState<string>(projects[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  // 클릭 시 이동 — 프로젝트/공지/직접 URL 중 선택
  const [linkKind, setLinkKind] = useState<LinkKind>("none");
  const [linkProjectId, setLinkProjectId] = useState<string>("");
  const [linkAnnouncementId, setLinkAnnouncementId] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [linkProjectQuery, setLinkProjectQuery] = useState<string>("");
  const [linkAnnouncementQuery, setLinkAnnouncementQuery] = useState<string>("");

  const filteredLinkProjects = useMemo(() => {
    const q = linkProjectQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, linkProjectQuery]);

  const filteredLinkAnnouncements = useMemo(() => {
    const q = linkAnnouncementQuery.trim().toLowerCase();
    if (!q) return announcements;
    return announcements.filter((a) => a.title.toLowerCase().includes(q));
  }, [announcements, linkAnnouncementQuery]);

  const resolvedUrl = useMemo(() => {
    if (linkKind === "project" && linkProjectId) return `/projects/${linkProjectId}`;
    if (linkKind === "announcement" && linkAnnouncementId) return `/announcements/${linkAnnouncementId}`;
    if (linkKind === "url") return linkUrl.trim();
    return "";
  }, [linkKind, linkProjectId, linkAnnouncementId, linkUrl]);

  const subscribed = useMemo(() => new Set(subscribedUserIds), [subscribedUserIds]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.stage_name ?? "").toLowerCase().includes(q)
    );
  }, [members, search]);

  // 예상 도달자 수
  const reachCount = useMemo(() => {
    if (kind === "all") return subscribed.size;
    if (kind === "self") return 1;
    if (kind === "users")
      return Array.from(pickedUsers).filter((uid) => subscribed.has(uid)).length;
    if (kind === "role") {
      return members
        .filter((m) => m.role === pickedRole)
        .filter((m) => subscribed.has(m.user_id)).length;
    }
    return 0; // project: 서버에서 계산
  }, [kind, pickedUsers, pickedRole, members, subscribed]);

  function toggleUser(userId: string) {
    setPickedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function send(testSelf = false) {
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 모두 입력하세요");
      return;
    }
    let target: Record<string, unknown>;
    if (testSelf) {
      target = { kind: "self" };
    } else if (kind === "all") target = { kind: "all" };
    else if (kind === "self") target = { kind: "self" };
    else if (kind === "users") {
      if (pickedUsers.size === 0) {
        toast.error("멤버를 한 명 이상 선택하세요");
        return;
      }
      target = { kind: "users", userIds: Array.from(pickedUsers) };
    } else if (kind === "role") target = { kind: "role", role: pickedRole };
    else if (kind === "project") {
      if (!pickedProjectId) {
        toast.error("프로젝트를 선택하세요");
        return;
      }
      target = { kind: "project", projectId: pickedProjectId };
    } else target = { kind: "all" };

    // 클릭 이동 URL 검증
    let finalUrl: string | undefined;
    if (linkKind === "project") {
      if (!linkProjectId) {
        toast.error("이동할 프로젝트를 선택하세요 (또는 '없음' 선택)");
        return;
      }
      finalUrl = `/projects/${linkProjectId}`;
    } else if (linkKind === "announcement") {
      if (!linkAnnouncementId) {
        toast.error("이동할 공지를 선택하세요 (또는 '없음' 선택)");
        return;
      }
      finalUrl = `/announcements/${linkAnnouncementId}`;
    } else if (linkKind === "url") {
      const trimmed = linkUrl.trim();
      if (!trimmed) {
        toast.error("이동할 URL을 입력하세요 (또는 '없음' 선택)");
        return;
      }
      finalUrl = trimmed;
    }

    setSending(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: finalUrl,
          target,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "발송에 실패했습니다");
        return;
      }
      const r = json.data as { sent: number; failed: number; total: number };
      toast.success(
        r.total === 0
          ? "발송 대상이 없습니다 (구독자 없음)"
          : `${r.sent}건 발송, ${r.failed}건 실패 (총 ${r.total})`
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="os-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* 좌: 폼 */}
      <div className="card">
        <div style={{ padding: 18 }}>
          <h3 style={{ marginBottom: 14 }}>메시지</h3>

          <label className="lab text-xs muted">제목</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 새 프로젝트 모집"
            maxLength={120}
          />

          <label className="lab text-xs muted mt-12">내용</label>
          <textarea
            className="input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="알림 본문 (최대 500자)"
            maxLength={500}
            rows={4}
          />

          <label className="lab text-xs muted mt-12">클릭 시 이동 (선택)</label>
          <div className="row gap-4" style={{ flexWrap: "wrap" }}>
            {(
              [
                ["none", "없음"],
                ["project", "프로젝트"],
                ["announcement", "공지"],
                ["url", "직접 URL"],
              ] as Array<[LinkKind, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`btn sm ${linkKind === k ? "primary" : ""}`}
                onClick={() => setLinkKind(k)}
              >
                {label}
              </button>
            ))}
          </div>

          {linkKind === "project" && (
            <div className="mt-8">
              <input
                className="input sm"
                value={linkProjectQuery}
                onChange={(e) => setLinkProjectQuery(e.target.value)}
                placeholder="프로젝트 제목 검색"
              />
              <select
                className="input mt-8"
                value={linkProjectId}
                onChange={(e) => setLinkProjectId(e.target.value)}
                size={Math.min(6, Math.max(3, filteredLinkProjects.length))}
                style={{ height: "auto" }}
              >
                <option value="">— 프로젝트 선택 —</option>
                {filteredLinkProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.status}] {p.title}
                  </option>
                ))}
              </select>
              {linkProjectId && (
                <div className="mono text-xs muted mt-4">→ /projects/{linkProjectId}</div>
              )}
            </div>
          )}

          {linkKind === "announcement" && (
            <div className="mt-8">
              <input
                className="input sm"
                value={linkAnnouncementQuery}
                onChange={(e) => setLinkAnnouncementQuery(e.target.value)}
                placeholder="공지 제목 검색"
              />
              <select
                className="input mt-8"
                value={linkAnnouncementId}
                onChange={(e) => setLinkAnnouncementId(e.target.value)}
                size={Math.min(6, Math.max(3, filteredLinkAnnouncements.length))}
                style={{ height: "auto" }}
              >
                <option value="">— 공지 선택 —</option>
                {filteredLinkAnnouncements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.pinned ? "📌 " : ""}
                    {a.title}
                  </option>
                ))}
              </select>
              {linkAnnouncementId && (
                <div className="mono text-xs muted mt-4">→ /announcements/{linkAnnouncementId}</div>
              )}
            </div>
          )}

          {linkKind === "url" && (
            <input
              className="input mt-8"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/dashboard, /mypage, https://..."
              maxLength={500}
            />
          )}

          <h3 style={{ marginTop: 20, marginBottom: 10 }}>대상</h3>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            {(
              [
                ["self", "나에게 (테스트)"],
                ["all", "전체"],
                ["users", "특정 멤버"],
                ["role", "역할별"],
                ["project", "프로젝트 참여자"],
              ] as Array<[TargetKind, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                className={`btn sm ${kind === k ? "primary" : ""}`}
                onClick={() => setKind(k)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {kind === "users" && (
            <div className="mt-12">
              <input
                className="input sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름/예명 검색"
              />
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  marginTop: 8,
                }}
              >
                {filteredMembers.length === 0 ? (
                  <div className="text-xs muted" style={{ padding: 12 }}>
                    검색 결과가 없어요
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const isSub = subscribed.has(m.user_id);
                    const checked = pickedUsers.has(m.user_id);
                    return (
                      <label
                        key={m.user_id}
                        className="row gap-8"
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          opacity: isSub ? 1 : 0.55,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUser(m.user_id)}
                        />
                        <div className="flex-1">
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                          {m.stage_name && (
                            <div className="mono text-xs muted">{m.stage_name}</div>
                          )}
                        </div>
                        {isSub ? (
                          <span className="badge ok">
                            <Bell size={10} strokeWidth={2} /> 구독
                          </span>
                        ) : (
                          <span className="badge">미구독</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
              <div className="text-xs muted mt-8">
                선택 {pickedUsers.size}명 · 회색은 알림 미구독자 (전송되지 않음)
              </div>
            </div>
          )}

          {kind === "role" && (
            <div className="mt-12 row gap-8">
              {(["owner", "admin", "member"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`btn sm ${pickedRole === r ? "primary" : ""}`}
                  onClick={() => setPickedRole(r)}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          )}

          {kind === "project" && (
            <div className="mt-12">
              <select
                className="input"
                value={pickedProjectId}
                onChange={(e) => setPickedProjectId(e.target.value)}
              >
                {projects.length === 0 && <option value="">활성 프로젝트 없음</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.status})
                  </option>
                ))}
              </select>
              <div className="text-xs muted mt-8">
                해당 프로젝트의 승인된(approved) 참여자에게 전송됩니다.
              </div>
            </div>
          )}

          <div className="row gap-8 mt-20" style={{ alignItems: "center" }}>
            <button
              type="button"
              className="btn"
              onClick={() => send(true)}
              disabled={sending}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />}
              나에게 테스트
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => send(false)}
              disabled={sending}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2} />}
              발송
            </button>
            <span className="text-xs muted" style={{ marginLeft: "auto" }}>
              {kind === "project" ? "예상 인원: 서버에서 계산" : `예상 도달: ${reachCount}명`}
            </span>
          </div>
        </div>
      </div>

      {/* 우: 미리보기 */}
      <div className="card">
        <div style={{ padding: 18 }}>
          <h3 style={{ marginBottom: 14 }}>미리보기</h3>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 14,
              background: "var(--card-bg, #fff)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div className="row gap-8 mb-8" style={{ alignItems: "center" }}>
              <img
                src="/icon-192.png"
                alt=""
                style={{ width: 28, height: 28, borderRadius: 6 }}
              />
              <div className="text-xs muted">원샷크루</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              {title || "제목"}
            </div>
            <div style={{ fontSize: 13, color: "var(--mf)" }}>
              {body || "본문 내용"}
            </div>
            {resolvedUrl && (
              <div className="mono text-xs muted mt-8">→ {resolvedUrl}</div>
            )}
          </div>

          <div className="text-xs muted mt-16">
            * 실제 알림은 OS의 알림 스타일에 따라 다르게 보일 수 있어요.<br />
            * iOS는 PWA를 홈 화면에 추가하고 알림을 허용한 사용자만 수신합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
