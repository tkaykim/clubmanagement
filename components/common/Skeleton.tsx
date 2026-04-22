export function SkeletonCard({ h = 120 }: { h?: number }) {
  return (
    <div className="card" style={{ height: h }}>
      <div className="sk" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card stat">
      <div className="sk" style={{ height: 12, width: 80, borderRadius: 4, marginBottom: 8 }} />
      <div className="sk" style={{ height: 36, width: 60, borderRadius: 4, marginBottom: 6 }} />
      <div className="sk" style={{ height: 10, width: 100, borderRadius: 4 }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
      <div className="sk" style={{ width: 32, height: 32, borderRadius: "50%" }} />
      <div style={{ flex: 1 }}>
        <div className="sk" style={{ height: 13, width: "60%", borderRadius: 4, marginBottom: 6 }} />
        <div className="sk" style={{ height: 11, width: "40%", borderRadius: 4 }} />
      </div>
      <div className="sk" style={{ height: 22, width: 48, borderRadius: 4 }} />
    </div>
  );
}
