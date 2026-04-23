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
        <div>
          <p className="pf-eyebrow" style={{ marginBottom: 16 }}>ONESHOT CREW와 함께하세요</p>
          <h2 className="pf-cta-title">특별한 순간을 만들어 드립니다</h2>
          <button
            className="btn primary lg"
            onClick={() => setInquiryOpen(true)}
            aria-haspopup="dialog"
            style={{ background: "#fff", color: "var(--fg)", fontSize: 16, padding: "14px 32px", marginBottom: 16 }}
          >
            섭외 문의하기
          </button>
          {contactEmail && (
            <p style={{ fontSize: 14, color: "var(--pf-hero-muted)" }}>{contactEmail}</p>
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
