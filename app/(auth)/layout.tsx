export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* 브랜드 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/icon-192.png"
            alt="원샷크루"
            style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px", border: "1px solid var(--border)" }}
          />
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>원샷크루</div>
          <div
            style={{
              fontSize: 11,
              color: "var(--mf)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            ONESHOT CREW
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
