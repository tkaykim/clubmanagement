"use client";

import { AlertTriangle } from "lucide-react";

export default function PortfolioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, textAlign: "center", padding: "40px 20px" }}>
      <AlertTriangle size={48} style={{ color: "var(--warn)" }} />
      <div style={{ fontWeight: 700, fontSize: 16 }}>포트폴리오를 불러올 수 없습니다</div>
      <div style={{ fontSize: 13, color: "var(--mf)" }}>잠시 후 다시 시도해 주세요.</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn primary" onClick={reset}>다시 시도</button>
        <a href="/portfolio" className="btn ghost">처음으로</a>
      </div>
    </div>
  );
}
