"use client";

import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import { InquiryDialog } from "./InquiryDialog";
import type { PublicCrewMember, PortfolioMediaWithMembers } from "@/lib/types";

interface PublicFooterProps {
  contactEmail: string;
  contactPhone?: string;
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

export function PublicFooter({ contactEmail, contactPhone, members, mediaMap }: PublicFooterProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <>
      <footer className="pf-footer">
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>원샷크루</div>
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--pf-hero-fg)", marginBottom: 8, fontSize: 14 }}
          >
            <Mail size={14} />
            {contactEmail}
          </a>
        )}
        {contactPhone && (
          <a
            href={`tel:${contactPhone}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--pf-hero-muted)", marginBottom: 16, fontSize: 14 }}
          >
            <Phone size={14} />
            {contactPhone}
          </a>
        )}
        <button
          className="btn"
          onClick={() => setInquiryOpen(true)}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", marginBottom: 32 }}
          aria-haspopup="dialog"
        >
          섭외 문의하기
        </button>
        <div
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--pf-hero-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          © {new Date().getFullYear()} ONESHOT CREW
        </div>
      </footer>
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
