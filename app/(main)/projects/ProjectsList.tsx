"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Folder, Calendar, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AvatarStack } from "@/components/ui/OsAvatar";
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
};

const ACTIVE_STATUSES = new Set(["recruiting", "selecting", "in_progress"]);

export function ProjectsList({ projects }: { projects: ProjectRow[] }) {
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
        <div className="os-grid grid-projects">
          {filtered.map(p => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card flush"
              style={{
                cursor: "pointer",
                textDecoration: "none",
                transition: "border-color 150ms",
              }}
            >
              <div className="project-poster">
                {p.poster_url ? (
                  <img
                    src={p.poster_url}
                    alt={p.title}
                    className="project-poster-img"
                  />
                ) : (
                  <div className="poster thumb project-poster-empty">
                    NO POSTER
                  </div>
                )}
                {p.type && (
                  <div className="project-type-overlay">
                    <StatusBadge status={p.type} />
                  </div>
                )}
              </div>
              <div className="project-card-body">
                <div className="project-card-meta">
                  <StatusBadge status={p.status} />
                  <span className={`badge ${payTypeChipTone(p.pay_type)}`}>
                    {fmtPay(p.pay_type, p.fee)}
                  </span>
                </div>
                <div className="project-card-title">{p.title}</div>
                <dl className="kv" style={{ gap: "4px 12px" }}>
                  {p.start_date && (
                    <>
                      <dt>
                        <Calendar size={10} strokeWidth={2} />
                      </dt>
                      <dd className="mono text-xs">{p.start_date}</dd>
                    </>
                  )}
                  {p.venue && (
                    <>
                      <dt>
                        <MapPin size={10} strokeWidth={2} />
                      </dt>
                      <dd className="text-xs">{p.venue}</dd>
                    </>
                  )}
                </dl>
                <div className="divider" style={{ margin: "10px 0" }} />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <AvatarStack members={[]} max={5} />
                  <span className="btn sm">자세히</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
