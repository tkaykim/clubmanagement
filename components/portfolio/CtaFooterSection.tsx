"use client";

import { useState } from "react";
import { InquiryDialog } from "./InquiryDialog";
import type { PublicCrewMember, PortfolioMediaWithMembers } from "@/lib/types";

interface CtaFooterSectionProps {
  contactEmail: string;
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

export function CtaFooterSection({ contactEmail, members, mediaMap }: CtaFooterSectionProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <>
      <section id="cta" className="pf-cta-section">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p className="pf-eyebrow" style={{ marginBottom: 16 }}>BOOKING / INQUIRY</p>
          <h2 className="pf-cta-title">
            Your One<br />Kill Stage.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--pf-hero-muted)",
              lineHeight: 1.65,
              margin: "0 auto 28px",
              maxWidth: 520,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            공연 · 방송 · 광고 · 워크숍 어떤 무대든,
            원샷크루가 가장 임팩트 있게 만들어 드립니다.
          </p>
          <button
            className="btn primary lg"
            onClick={() => setInquiryOpen(true)}
            aria-haspopup="dialog"
            style={{ fontSize: 14, padding: "14px 28px", marginBottom: 14 }}
          >
            섭외 문의하기 →
          </button>
          {contactEmail && (
            <p style={{ fontSize: 13, color: "var(--pf-hero-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{contactEmail}</p>
          )}
        </div>
      </section>

      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        defaultTargetType="team"
        members={members}
        referenceMediaMap={mediaMap}
      />
    </>
  );
}
