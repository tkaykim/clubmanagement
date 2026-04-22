"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Megaphone, Pin } from "lucide-react";

type ProjectOpt = { id: string; title: string; status: string };

export function NewAnnouncementForm({ projects }: { projects: ProjectOpt[] }) {
  const router = useRouter();
  const [scope, setScope] = useState<"team" | "project">("team");
  const [projectId, setProjectId] = useState<string>("");
  const [projectQuery, setProjectQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projects.slice(0, 30);
    return projects
      .filter(p => p.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [projects, projectQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요");
      return;
    }
    if (scope === "project" && !projectId) {
      toast.error("프로젝트를 선택해주세요");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        scope,
        project_id: scope === "project" ? projectId : null,
        pinned,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "작성에 실패했습니다");
      setSubmitting(false);
      return;
    }
    toast.success("공지가 등록되었습니다");
    router.push("/announcements");
    router.refresh();
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link
            href="/announcements"
            className="row gap-6"
            style={{ color: "var(--mf)", fontSize: 13, textDecoration: "none", marginBottom: 6, display: "inline-flex" }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            돌아가기
          </Link>
          <h1>
            <span className="serif-tag">New</span>
            공지 작성
          </h1>
          <div className="sub">팀 전체 또는 특정 프로젝트에 공지를 전달합니다</div>
        </div>
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 0 }}>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 범위 */}
          <div className="field">
            <label>범위</label>
            <div className="tabs" style={{ marginTop: 4 }}>
              <button
                type="button"
                className={`tab ${scope === "team" ? "on" : ""}`}
                onClick={() => setScope("team")}
              >
                팀 공지
              </button>
              <button
                type="button"
                className={`tab ${scope === "project" ? "on" : ""}`}
                onClick={() => setScope("project")}
              >
                프로젝트 공지
              </button>
            </div>
            <div className="text-xs muted" style={{ marginTop: 6 }}>
              {scope === "team"
                ? "모든 활성 멤버가 볼 수 있습니다"
                : "선택한 프로젝트에 승인된 참여자만 볼 수 있습니다"}
            </div>
          </div>

          {/* 프로젝트 선택 (scope === project 일 때만) */}
          {scope === "project" && (
            <div className="field">
              <label>
                프로젝트 <span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="프로젝트명으로 검색"
                value={projectQuery}
                onChange={e => setProjectQuery(e.target.value)}
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
                {filteredProjects.length === 0 ? (
                  <div className="empty" style={{ padding: 16, fontSize: 13 }}>
                    결과가 없습니다
                  </div>
                ) : (
                  filteredProjects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProjectId(p.id)}
                      style={{
                        display: "flex",
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        alignItems: "center",
                        gap: 8,
                        background: projectId === p.id ? "var(--muted)" : "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</span>
                      <span className="mono text-xs muted" style={{ marginLeft: "auto" }}>
                        {p.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div className="field">
            <label>
              제목 <span className="req">*</span>
            </label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 5월 정기 모임 공지"
              maxLength={300}
              required
            />
          </div>

          {/* 내용 */}
          <div className="field">
            <label>
              내용 <span className="req">*</span>
            </label>
            <textarea
              className="input"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              rows={8}
              required
              style={{ minHeight: 160, resize: "vertical" }}
            />
          </div>

          {/* 고정 */}
          <label className="row gap-8" style={{ cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
            />
            <Pin size={14} strokeWidth={2} />
            <span style={{ fontSize: 13 }}>상단 고정</span>
          </label>
        </div>

        <div
          className="row"
          style={{
            justifyContent: "flex-end",
            padding: 14,
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elev)",
            gap: 8,
          }}
        >
          <Link href="/announcements" className="btn ghost">
            취소
          </Link>
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} strokeWidth={2} />}
            공지 등록
          </button>
        </div>
      </form>
    </div>
  );
}
