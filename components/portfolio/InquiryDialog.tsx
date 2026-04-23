"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InquiryForm } from "./InquiryForm";
import type { PublicCrewMember, PortfolioMediaWithMembers } from "@/lib/types";

interface InquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTargetType?: "team" | "member";
  defaultMemberId?: string;
  defaultReferenceMediaId?: string;
  defaultInquiryType?: "performance" | "broadcast" | "commercial" | "workshop" | "other";
  members: PublicCrewMember[];
  referenceMediaMap?: Record<string, PortfolioMediaWithMembers>;
}

export function InquiryDialog({
  open,
  onOpenChange,
  defaultTargetType = "team",
  defaultMemberId,
  defaultReferenceMediaId,
  defaultInquiryType,
  members,
  referenceMediaMap = {},
}: InquiryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90dvh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-title"
      >
        <DialogHeader>
          <DialogTitle id="inquiry-title">섭외 문의하기</DialogTitle>
          <DialogDescription>문의 내용을 작성해 주세요.</DialogDescription>
        </DialogHeader>
        <InquiryForm
          defaultTargetType={defaultTargetType}
          defaultMemberId={defaultMemberId}
          defaultReferenceMediaId={defaultReferenceMediaId}
          defaultInquiryType={defaultInquiryType}
          members={members}
          referenceMediaMap={referenceMediaMap}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
