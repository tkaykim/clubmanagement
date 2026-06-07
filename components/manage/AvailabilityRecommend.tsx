"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScheduleCandidate, MemberLite } from "@/lib/availability-recommend";

interface Props {
  candidates: ScheduleCandidate[];
  poolSize: number;
  windowSlots: number;
  includePartial: boolean;
  onWindowSlotsChange: (n: number) => void;
  onIncludePartialChange: (v: boolean) => void;
}

function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function kstDow(dateStr: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).formatToParts(new Date(`${dateStr}T00:00:00+09:00`));
  return parts.find((p) => p.type === "weekday")?.value ?? "";
}

function Chips({ list, color, glyph }: { list: MemberLite[]; color: string; glyph: string }) {
  return (
    <div className="row gap-4" style={{ flexWrap: "wrap" }}>
      {list.map((m) => (
        <span
          key={m.appId}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "var(--muted)",
            padding: "3px 8px",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <span style={{ color, fontWeight: 700 }}>{glyph}</span>
          {m.name}
        </span>
      ))}
    </div>
  );
}

export function AvailabilityRecommend({
  candidates,
  poolSize,
  windowSlots,
  includePartial,
  onWindowSlotsChange,
  onIncludePartialChange,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const maxCount = Math.max(0, ...candidates.map((c) => c.count));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* 컨트롤 */}
      <div className="card" style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>최소 블록 길이</span>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={windowSlots}
              onChange={(e) => onWindowSlotsChange(Number(e.target.value))}
              style={{ width: 160 }}
              aria-label="최소 블록 길이"
            />
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: 700, minWidth: 64, color: "var(--accent, #3b82f6)" }}
            >
              {durationLabel(windowSlots * 30)}
            </span>
          </div>
          <label className="row gap-6" style={{ alignItems: "center", cursor: "pointer", fontSize: 12 }}>
            <input
              type="checkbox"
              checked={includePartial}
              onChange={(e) => onIncludePartialChange(e.target.checked)}
            />
            부분가능도 겹침 인원에 포함
          </label>
        </div>
        <div className="hint" style={{ fontSize: 11, color: "var(--mf)" }}>
          각 날짜에서 가장 많은 멤버가 동시에 비는 {durationLabel(windowSlots * 30)} 이상 시간창을 찾아 인원순으로 정렬합니다.
          {includePartial
            ? " 겹침 인원에 확정 '가능' + 해당 시간 '부분가능'을 함께 셉니다."
            : " 겹침 인원은 확정 '가능'(종일)만 세고, 부분·조정가능은 별도 표기합니다."}
        </div>
      </div>

      {candidates.map((c) => {
        const isBest = c.count === maxCount && c.count > 0;
        const isOpen = expanded.has(c.dateId);
        return (
          <div
            key={c.dateId}
            className="card"
            style={{
              padding: "10px 12px",
              borderLeft: isBest ? "3px solid var(--accent, #3b82f6)" : undefined,
            }}
          >
            {/* 헤더 */}
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="row gap-6" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14 }}>
                  {c.date} ({kstDow(c.date)})
                </strong>
                <span
                  style={{
                    fontSize: 9,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: c.kind === "practice" ? "var(--muted)" : "var(--accent-soft, #f0f4ff)",
                    color: c.kind === "practice" ? "var(--mf)" : "var(--accent, #3b82f6)",
                    fontWeight: 600,
                  }}
                >
                  {c.kind === "practice" ? "연습" : "본행사"}
                </span>
                {c.label && (
                  <span style={{ fontSize: 10, color: "var(--mf)", fontFamily: "var(--font-mono)" }}>{c.label}</span>
                )}
                {isBest && (
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "var(--accent, #3b82f6)", color: "#fff", fontWeight: 700 }}>
                    추천
                  </span>
                )}
              </div>
              <div className="row gap-8" style={{ alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                  {c.startLabel}~{c.endLabel}
                </span>
                <span className="mono" style={{ fontSize: 10, color: "var(--mf)" }}>
                  {durationLabel(c.durationMin)}
                </span>
              </div>
            </div>

            {/* 겹침 인원 */}
            <div className="row gap-8" style={{ alignItems: "baseline", marginTop: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: isBest ? "var(--accent, #3b82f6)" : "var(--fg)", lineHeight: 1 }}>
                {c.count}
              </span>
              <span style={{ fontSize: 11, color: "var(--mf)" }}>/ {poolSize}명 겹침</span>
              {c.partialIn.length > 0 && !includePartial && (
                <span style={{ fontSize: 11, color: "#4d7c0f" }}>+ 부분가능 {c.partialIn.length}</span>
              )}
              {c.adjustable.length > 0 && (
                <span style={{ fontSize: 11, color: "#a16207" }}>+ 조정가능 {c.adjustable.length}</span>
              )}
            </div>

            {/* 멤버 그룹 */}
            <div style={{ display: "grid", gap: 6 }}>
              {c.fullDay.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", marginBottom: 3 }}>
                    확정 가능 · {c.fullDay.length}
                  </div>
                  <Chips list={c.fullDay} color="#22c55e" glyph="●" />
                </div>
              )}
              {c.partialIn.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4d7c0f", marginBottom: 3 }}>
                    부분가능 (이 시간대) · {c.partialIn.length}
                  </div>
                  <Chips list={c.partialIn} color="#84cc16" glyph="◐" />
                </div>
              )}
              {c.adjustable.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#a16207", marginBottom: 3 }}>
                    조정가능 (협의) · {c.adjustable.length}
                  </div>
                  <Chips list={c.adjustable} color="#eab308" glyph="◇" />
                </div>
              )}
              {c.missing.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => toggle(c.dateId)}
                    style={{ padding: "2px 4px", fontSize: 10, color: "var(--mf)" }}
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    빠지는 멤버 · {c.missing.length}
                  </button>
                  {isOpen && (
                    <div style={{ marginTop: 4 }}>
                      <Chips list={c.missing} color="#94a3b8" glyph="✕" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
