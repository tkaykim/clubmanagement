"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Folder, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OsAvatar } from "@/components/ui/OsAvatar";
import { fmtPay, payTypeChipTone } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  poster_url: string | null;
  start_date: string | null;
  pay_type: string | null;
  fee: number;
  venue: string | null;
  max_participants: number | null;
  owner_id: string | null;
  owner_name: string | null;
};

const ACTIVE_STATUSES = new Set(["recruiting", "selecting", "in_progress"]);

interface ProjectsListProps {
  projects: ProjectRow[];
  /** 현재 사용자가 지원한 프로젝트별 미투표 일정 수 */
  unvotedByProject?: Record<string, number>;
}

export function ProjectsList({ projects, unvotedByProject }: ProjectsListProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [query, setQuery] = useState("");
  const archived = sp.get("archived") === "1";

  function toggleArchived() {
    const next = new URLSearchParams(sp.toString());
    if (archived) next.delete("archived");
    else next.set("archived", "1");
    router.replace(`/projects?${next}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    let list = archived
      ? projects
      : projects.filter(p => ACTIVE_STATUSES.has(p.status));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          (p.venue ?? "").toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q)
      );
    }

    // 아카이브 ON: 진행중을 앞으로 정렬
    if (archived) {
      list = [...list].sort(
        (a, b) =>
          (ACTIVE_STATUSES.has(b.status) ? 1 : 0) -
          (ACTIVE_STATUSES.has(a.status) ? 1 : 0)
      );
    }

    return list;
  }, [projects, query, archived]);

  const emptyMsg = query.trim()
    ? `"${query}"와 일치하는 프로젝트가 없어요`
    : !archived
    ? "진행 중인 프로젝트가 없어요"
    : "프로젝트가 없어요";

  return (
    <>
      {/* 컨트롤 바 */}
      <div className="row gap-8 mb-16" style={{ flexWrap: "wrap" }}>
        <input
          className="input"
          type="search"
          placeholder="제목·장소·타입 검색"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: "1 1 180px", minWidth: 0 }}
        />
        <label
          className="row gap-6"
          style={{ cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <input
            type="checkbox"
            checked={archived}
            onChange={toggleArchived}
          />
          종료/취소된 프로젝트도 보기
        </label>
      </div>
      <div className="sub mb-12" style={{ fontSize: 12 }}>
        표시 {filtered.length}건 / 전체 {projects.length}건
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Folder className="ico" strokeWidth={1.5} />
            <div>{emptyMsg}</div>
            {query.trim() && (
              <button className="btn sm" onClick={() => setQuery("")}>
                검색어 지우기
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card flush tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>상태</th>
                <th>타입</th>
                <th>제목</th>
                <th>일정</th>
                <th>장소</th>
                <th>페이</th>
                <th>개설자</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const unvoted = unvotedByProject?.[p.id] ?? 0;
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td data-label="상태">
                      <StatusBadge status={p.status} />
                    </td>
                    <td data-label="타입">
                      <StatusBadge status={p.type} />
                    </td>
                    <td data-label="제목" style={{ fontWeight: 600 }}>
                      <div className="row gap-6" style={{ alignItems: "center", flexWrap: "wrap" }}>
                        <span>{p.title}</span>
                        {unvoted > 0 && (
                          <span
                            aria-label={`투표 필요 ${unvoted}개`}
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 8,
                              whiteSpace: "nowrap",
                            }}
                          >
                            투표 필요 {unvoted}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="일정" className="mono text-xs muted">
                      {p.start_date ?? "—"}
                    </td>
                    <td data-label="장소" className="text-xs">
                      {p.venue ?? "—"}
                    </td>
                    <td data-label="페이">
                      <span className={`badge ${payTypeChipTone(p.pay_type)}`}>
                        {fmtPay(p.pay_type, p.fee)}
                      </span>
                    </td>
                    <td data-label="개설자">
                      {p.owner_name ? (
                        <div className="row gap-6" style={{ alignItems: "center", minWidth: 0 }}>
                          <OsAvatar name={p.owner_name} size="sm" />
                          <span
                            className="text-xs sub"
                            style={{
                              maxWidth: 100,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.owner_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs sub">개설자 미상</span>
                      )}
                    </td>
                    <td data-label="" style={{ textAlign: "right" }}>
                      <ChevronRight size={14} strokeWidth={2} style={{ color: "var(--mf)" }} />
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
