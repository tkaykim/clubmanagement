"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { InquiryDialog } from "./InquiryDialog";
import type { PublicCrewMember, PortfolioMediaWithMembers } from "@/lib/types";

interface MemberCardGridProps {
  members: PublicCrewMember[];
  mediaMap: Record<string, PortfolioMediaWithMembers>;
}

export function MemberCardGrid({ members, mediaMap }: MemberCardGridProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const handleInquire = (memberId: string) => {
    setSelectedMemberId(memberId);
    setInquiryOpen(true);
  };

  return (
    <>
      <section id="members" className="pf-section-band">
        <div className="pf-section">
          <div className="pf-section-head">
            <span className="pf-section-num">07 / MEMBERS</span>
            <h2 className="pf-section-title">멤버 소개</h2>
            <span className="pf-section-kicker">{members.length > 0 ? `${members.length} active` : ""}</span>
          </div>

          {members.length === 0 ? (
            <div className="empty">
              <Users className="ico" strokeWidth={1.5} />
              <div>공개된 멤버가 없습니다</div>
            </div>
          ) : (
            <div className="pf-member-grid">
              {members.map((m) => (
                <MemberCard key={m.id} member={m} onInquire={handleInquire} />
              ))}
            </div>
          )}
        </div>
      </section>

      <InquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        defaultTargetType="member"
        defaultMemberId={selectedMemberId}
        members={members}
        referenceMediaMap={mediaMap}
      />
    </>
  );
}
