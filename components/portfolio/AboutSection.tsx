import type { PublicCrewMember } from "@/lib/types";

interface AboutSectionProps {
  aboutText: string;
  genres: string[];
  members?: PublicCrewMember[];
}

const GENRE_ORDER = ["K-POP", "한국무용", "현대무용", "댄스스포츠", "힙합", "브레이킹"];

export function AboutSection({ aboutText, genres, members = [] }: AboutSectionProps) {
  const totalMembers = 50;
  const activeMembers = members.length || 16;

  const normalized = genres.length > 0 ? genres : GENRE_ORDER;

  return (
    <section id="about" className="pf-section-band alt">
      <div className="pf-section">
        <div className="pf-section-head">
          <span className="pf-section-num">01 / INTRODUCTION</span>
          <h2 className="pf-section-title">팀 소개</h2>
          <span className="pf-section-kicker">Since 2023</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
          className="pf-about-grid"
        >
          <div>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.75,
                color: "var(--pf-ink-soft)",
                margin: "0 0 20px",
                fontWeight: 500,
                wordBreak: "keep-all",
              }}
            >
              {aboutText || "원샷크루(ONESHOT CREW)는 한국의 전통춤과 현대적인 에너지를 결합한 퍼포먼스 팀으로, 댄스필름과 공연을 통해 '하나의 컷(ONE SHOT)'에 담긴 순간의 감동을 전달합니다."}
            </p>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "var(--pf-mf)",
                margin: 0,
                wordBreak: "keep-all",
              }}
            >
              유튜브 기반으로 활동하며, K-POP을 중심으로 한국무용·현대무용·댄스스포츠·힙합·브레이킹 등 다양한 장르를 융합해 국내외에서 주목받는 아티스트들과 협업하고 있습니다.
            </p>

            {/* 스탯 카드 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginTop: 28,
              }}
              className="pf-stat-grid"
            >
              <StatCard label="전체 멤버" value={`${totalMembers}+`} sub="Total" />
              <StatCard label="주요 활동" value={`${activeMembers}`} sub="Active" />
              <StatCard label="장르" value={`${normalized.length}`} sub="Genres" />
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "var(--pf-mf)",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Specialties / 6 Genres
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {normalized.map((g) => (
                <span
                  key={g}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 12.5,
                    padding: "7px 14px",
                    border: "1px solid var(--pf-border-2)",
                    borderRadius: 999,
                    fontWeight: 600,
                    background: "transparent",
                    color: "var(--pf-ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {g.trim()}
                </span>
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                padding: "18px 20px",
                background: "var(--pf-bg-card)",
                border: "1px solid var(--pf-border)",
                borderRadius: "var(--radius-os)",
                borderLeft: "2px solid #fff",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "var(--pf-ink)",
                  textTransform: "uppercase",
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                Why ONESHOT
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: "var(--pf-ink-soft)",
                  wordBreak: "keep-all",
                }}
              >
                K-POP · 한국무용 · 현대무용 · 댄스스포츠 · 힙합 · 브레이킹
                —  한국의 전통춤과 현대적 에너지가 한 무대에서 만나 &lsquo;하나의 컷(ONE SHOT)&rsquo;이 됩니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        padding: "16px 14px",
        background: "var(--pf-bg-card)",
        border: "1px solid var(--pf-border)",
        borderRadius: "var(--radius-os)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--pf-mf)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {sub}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "var(--pf-ink)",
          lineHeight: 1,
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--pf-mf)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
