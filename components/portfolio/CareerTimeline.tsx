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

function formatCareerDate(date: string | null | undefined): string {
  if (!date) return "";
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date.replace(/-/g, ".");
  const [, y, mo, d] = m;
  // PDF sourced entries use day=01 as a placeholder → show YYYY.MM only.
  if (d === "01") return `${y}.${mo}`;
  return `${y}.${mo}.${d}`;
}

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
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--pf-ink)", letterSpacing: "-0.02em", marginBottom: 16, fontFamily: "var(--font-mono)" }}>{year}</div>
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
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--pf-mf)", paddingTop: 2 }}>
                        {formatCareerDate(career.event_date)}
                      </div>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 2, background: "var(--pf-border-2)", height: "100%", position: "absolute", left: 0, top: 0 }} />
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", position: "absolute", left: -3, top: 4 }} />
                      </div>
                      <div>
                        {career.category && CATEGORY_STYLES[career.category] && (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.08)",
                              color: "var(--pf-ink-soft)",
                              border: "1px solid var(--pf-border)",
                              fontWeight: 600,
                              fontFamily: "var(--font-mono)",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              marginBottom: 6,
                            }}
                          >
                            {CATEGORY_LABELS[career.category]}
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--pf-ink)", marginBottom: 4, letterSpacing: "-0.01em" }}>{career.title}</div>
                        {career.location && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--pf-mf)", marginBottom: 4 }}>
                            <MapPin size={12} />
                            {career.location}
                          </div>
                        )}
                        {career.description && (
                          <div style={{ fontSize: 12, color: "var(--pf-mf)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {career.description}
                          </div>
                        )}
                        {career.link_url && (
                          <a href={career.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--pf-ink-soft)", marginTop: 4, display: "inline-block", textDecoration: "underline", textUnderlineOffset: 3 }}>
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
