"use client";

import { useState } from "react";
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
        <a href="/portfolio" className="pf-header-brand">
          <span style={{ fontSize: 15, fontWeight: 700 }}>원샷크루</span>
        </a>
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
