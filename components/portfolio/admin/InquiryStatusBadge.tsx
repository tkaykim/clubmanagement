import type { PortfolioInquiryStatus } from "@/lib/types";

interface InquiryStatusBadgeProps {
  status: PortfolioInquiryStatus;
  size?: "default" | "sm";
}

const STATUS_CONFIG: Record<PortfolioInquiryStatus, { label: string; bg: string; fg: string }> = {
  new: { label: "신규", bg: "var(--inq-new-bg)", fg: "var(--inq-new-fg)" },
  in_review: { label: "검토중", bg: "var(--inq-in_review-bg)", fg: "var(--inq-in_review-fg)" },
  contacted: { label: "연락완료", bg: "var(--inq-contacted-bg)", fg: "var(--inq-contacted-fg)" },
  on_hold: { label: "보류", bg: "var(--inq-on_hold-bg)", fg: "var(--inq-on_hold-fg)" },
  closed: { label: "완료", bg: "var(--inq-closed-bg)", fg: "var(--inq-closed-fg)" },
};

export function InquiryStatusBadge({ status, size = "default" }: InquiryStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const fontSize = size === "sm" ? 10 : 11.5;
  const padding = size === "sm" ? "2px 6px" : "3px 8px";

  return (
    <span
      role="status"
      aria-label={`문의 상태: ${cfg.label}`}
      style={{
        display: "inline-block",
        fontSize,
        padding,
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.fg,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
