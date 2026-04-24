"use client";

import { useState } from "react";
import { Mail, Phone, Youtube, Instagram } from "lucide-react";
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
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="pf-footer">
        <div
          style={{
            maxWidth: "var(--pf-max-w-narrow)",
            margin: "0 auto",
            padding: "0 16px",
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: 8,
              color: "#fff",
              textTransform: "uppercase",
            }}
          >
            ONESHOT
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              marginBottom: 32,
            }}
          >
            One Kill · Since 2023
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--pf-hero-fg)",
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  textDecoration: "none",
                }}
              >
                <Mail size={14} />
                {contactEmail}
              </a>
            )}
            {contactPhone && (
              <a
                href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--pf-hero-muted)",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  textDecoration: "none",
                }}
              >
                <Phone size={13} />
                {contactPhone}
              </a>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn primary"
              onClick={() => setInquiryOpen(true)}
              aria-haspopup="dialog"
              style={{ padding: "12px 22px", fontSize: 13 }}
            >
              섭외 문의하기 →
            </button>
            <a
              href="https://www.youtube.com/@ONESHOTcrewofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="btn pf-ghost"
              aria-label="유튜브"
              style={{ padding: "12px 16px", fontSize: 13 }}
            >
              <Youtube size={15} />
              YouTube
            </a>
            <a
              href="https://www.instagram.com/oneshot_crew_/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn pf-ghost"
              aria-label="인스타그램"
              style={{ padding: "12px 16px", fontSize: 13 }}
            >
              <Instagram size={15} />
              Instagram
            </a>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            © {year} ONESHOT CREW · ALL RIGHTS RESERVED
          </div>
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
