import type { PublicCrewMember } from "@/lib/types";

interface AboutSectionProps {
  aboutText: string;
  genres: string[];
  members?: PublicCrewMember[];
}

const GENRE_ORDER = ["K-pop", "한국무용", "현대무용", "댄스스포츠", "창작안무"];

export function AboutSection({ aboutText, genres, members = [] }: AboutSectionProps) {
  const totalMembers = 50;
  const activeMembers = members.length || 16;

  const normalized = genres.length > 0 ? genres : GENRE_ORDER;

  return (
    <section id="about" className="pf-section-band">
      <div className="pf-section">
        <div className="pf-section-head">
          <span className="pf-section-num">01 / INTRODUCTION</span>
          <h2 className="pf-section-title">팀 소개</h2>
          <span className="pf-section-kicker">Since 2010</span>
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
              }}
            >
              {aboutText || "원샷크루(ONESHOT CREW)는 K-POP 댄스를 기반으로 한국무용·현대무용·댄스스포츠까지 소화하는 크루입니다."}
            </p>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "var(--pf-mf)",
                margin: 0,
              }}
            >
              전공자 멤버가 포진해 있어 <strong style={{ color: "var(--pf-ink)" }}>창작 안무</strong>까지 직접 설계합니다. 단순 공연뿐 아니라 방송·광고·행사 맞춤 안무 제작이 가능합니다.
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
                letterSpacing: "0.12em",
                color: "var(--pf-mf)",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Specialties
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {normalized.map((g) => (
                <span
                  key={g}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 13,
                    padding: "8px 16px",
                    border: "1px solid var(--pf-border-2)",
                    borderRadius: 999,
                    fontWeight: 600,
                    background: "var(--pf-bg-card)",
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
                marginTop: 28,
                padding: "18px 20px",
                background: "var(--pf-bg-card)",
                border: "1px solid var(--pf-border)",
                borderRadius: "var(--radius-os)",
                borderLeft: "3px solid var(--pf-accent)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "var(--pf-accent)",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Why ONESHOT
              </div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "var(--pf-ink-soft)",
                }}
              >
                K-POP 댄스와 한국무용·현대무용·댄스스포츠를 한 팀에서. <strong style={{ color: "var(--pf-ink)" }}>전공자 기반 창작 안무</strong>로 무대를 설계합니다.
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
