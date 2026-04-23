import { MapPin, Trophy } from "lucide-react";
import type { PortfolioCareerWithMedia, PortfolioCareerCategory } from "@/lib/types";

interface CareerTimelineProps {
  careers: PortfolioCareerWithMedia[];
}

const CATEGORY_LABELS: Record<PortfolioCareerCategory, string> = {
  performance: "공연",
  broadcast: "방송",
  commercial: "CF·광고",
  competition: "대회",
  workshop: "워크숍",
};

const CATEGORY_STYLES: Record<PortfolioCareerCategory, { bg: string; fg: string }> = {
  performance: { bg: "var(--career-performance-bg)", fg: "var(--career-performance-fg)" },
  broadcast: { bg: "var(--career-broadcast-bg)", fg: "var(--career-broadcast-fg)" },
  commercial: { bg: "var(--career-commercial-bg)", fg: "var(--career-commercial-fg)" },
  competition: { bg: "var(--career-competition-bg)", fg: "var(--career-competition-fg)" },
  workshop: { bg: "var(--career-workshop-bg)", fg: "var(--career-workshop-fg)" },
};

function groupByYear(careers: PortfolioCareerWithMedia[]) {
  const map = new Map<string, PortfolioCareerWithMedia[]>();
  for (const c of careers) {
    const year = c.event_date ? c.event_date.slice(0, 4) : "연도 미상";
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(c);
  }
  return Array.from(map.entries());
}

export function CareerTimeline({ careers }: CareerTimelineProps) {
  const grouped = groupByYear(careers);

  return (
    <section id="career" className="pf-section-band alt">
      <div className="pf-section">
        <div className="pf-section-head">
          <span className="pf-section-num">06 / TRACK RECORD</span>
          <h2 className="pf-section-title">주요 경력</h2>
          <span className="pf-section-kicker">{careers.length > 0 ? `${careers.length} entries` : ""}</span>
        </div>

        {careers.length === 0 ? (
          <div className="empty">
            <Trophy className="ico" strokeWidth={1.5} />
            <div>경력이 없습니다</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {grouped.map(([year, items]) => (
              <div key={year}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{year}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {items.map((career, i) => (
                    <div
                      key={career.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "100px 2px 1fr",
                        gap: "0 16px",
                        paddingBottom: i < items.length - 1 ? 20 : 0,
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--mf)", paddingTop: 2 }}>
                        {career.event_date ? career.event_date.replace(/-/g, ".") : ""}
                      </div>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 2, background: "var(--border-2)", height: "100%", position: "absolute", left: 0, top: 0 }} />
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--fg)", position: "absolute", left: -3, top: 4 }} />
                      </div>
                      <div>
                        {career.category && CATEGORY_STYLES[career.category] && (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: CATEGORY_STYLES[career.category].bg,
                              color: CATEGORY_STYLES[career.category].fg,
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            {CATEGORY_LABELS[career.category]}
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{career.title}</div>
                        {career.location && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mf)", marginBottom: 4 }}>
                            <MapPin size={12} />
                            {career.location}
                          </div>
                        )}
                        {career.description && (
                          <div style={{ fontSize: 12, color: "var(--mf)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {career.description}
                          </div>
                        )}
                        {career.link_url && (
                          <a href={career.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--info)", marginTop: 4, display: "inline-block" }}>
                            관련 링크 →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
