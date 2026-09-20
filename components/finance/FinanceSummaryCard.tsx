import type { LucideIcon } from "lucide-react";
import { formatWon } from "./format";

export function FinanceSummaryCard({
  label,
  value,
  caption,
  displayValue,
  currency,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | null;
  caption?: string;
  displayValue?: string;
  currency?: string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "ok";
}) {
  return (
    <div className={`card finance-summary finance-summary-${tone}`}>
      <div className="finance-summary-top">
        <span>{label}</span>
        <Icon size={17} aria-hidden />
      </div>
      <strong className="tabnum">{displayValue ?? formatWon(value, true, currency)}</strong>
      {caption && <small>{caption}</small>}
    </div>
  );
}
