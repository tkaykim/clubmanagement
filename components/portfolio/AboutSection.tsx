import { GenreBadge } from "./GenreBadge";

interface AboutSectionProps {
  aboutText: string;
  genres: string[];
}

export function AboutSection({ aboutText, genres }: AboutSectionProps) {
  if (!aboutText && genres.length === 0) return null;

  return (
    <section id="about" style={{ background: "var(--bg)" }}>
      <div className="pf-section">
        <h2 className="pf-section-title">팀 소개</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
        >
          {aboutText && (
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "var(--fg-soft)", margin: 0 }}>
              {aboutText}
            </p>
          )}
          {genres.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {genres.map((g) => (
                <GenreBadge key={g} genre={g} size="lg" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
