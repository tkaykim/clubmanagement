"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { InquiryDialog } from "./InquiryDialog";
import type { PublicCrewMember, PortfolioMediaWithMembers } from "@/lib/types";

interface PublicHeaderProps {
  contactEmail: string;
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

export function PublicHeader({ contactEmail, members, mediaMap }: PublicHeaderProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <>
      <header className="pf-header">
        <Link href="/" className="pf-header-brand">
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.6 }}>ONESHOT</span>
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "var(--pf-mf)",
              textTransform: "uppercase",
              marginLeft: 8,
              paddingLeft: 8,
              borderLeft: "1px solid var(--pf-border-2)",
            }}
            className="pc-only"
          >
            One Kill
          </span>
        </Link>
        <div style={{ flex: 1 }} />
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            className="pf-header-email pc-only"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Mail size={12} />
            {contactEmail}
          </a>
        )}
        <button
          className="btn primary"
          onClick={() => setInquiryOpen(true)}
          aria-haspopup="dialog"
          style={{ fontSize: 12.5, padding: "0 14px", height: 34 }}
        >
          섭외 문의하기
        </button>
      </header>
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
