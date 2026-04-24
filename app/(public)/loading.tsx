export default function PortfolioLoading() {
  return (
    <>
      {/* Hero 스켈레톤 */}
      <div style={{ background: "var(--pf-hero-bg)", minHeight: "100svh", display: "flex", alignItems: "center", padding: "120px 32px 80px" }}>
        <div style={{ maxWidth: "var(--pf-max-w)", margin: "0 auto", width: "100%" }}>
          <div className="sk" style={{ height: 12, width: 100, marginBottom: 20, opacity: 0.3 }} />
          <div className="sk" style={{ height: 44, width: 320, marginBottom: 12, opacity: 0.3 }} />
          <div className="sk" style={{ height: 20, width: 240, marginBottom: 32, opacity: 0.3 }} />
          <div style={{ display: "flex", gap: 12 }}>
            <div className="sk" style={{ height: 42, width: 140, opacity: 0.3 }} />
            <div className="sk" style={{ height: 42, width: 140, opacity: 0.3 }} />
          </div>
        </div>
      </div>

      {/* About 스켈레톤 */}
      <div style={{ background: "var(--bg)" }}>
        <div className="pf-section">
          <div className="sk" style={{ height: 32, width: 200, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
            <div className="sk" style={{ height: 80, width: "100%" }} />
            <div className="sk" style={{ height: 32, width: 200 }} />
          </div>
        </div>
      </div>

      {/* 공연 영상 스켈레톤 */}
      <div style={{ background: "var(--muted)" }}>
        <div className="pf-section">
          <div className="sk" style={{ height: 32, width: 200, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[0,1,2,3,4,5].map((i) => (
              <div key={i} className="sk" style={{ aspectRatio: "16/9", borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>

      {/* 포토 갤러리 스켈레톤 */}
      <div style={{ background: "var(--bg)" }}>
        <div className="pf-section">
          <div className="sk" style={{ height: 32, width: 200, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[0,1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="sk" style={{ aspectRatio: "1", borderRadius: 8 }} />
            ))}
          </div>
        </div>
      </div>

      {/* 멤버 스켈레톤 */}
      <div style={{ background: "var(--muted)" }}>
        <div className="pf-section">
          <div className="sk" style={{ height: 32, width: 200, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {[0,1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="sk" style={{ aspectRatio: "4/5", borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
