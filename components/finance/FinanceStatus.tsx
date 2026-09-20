import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { financeStatusLabel, financeStatusTone } from "./format";

export function FinanceStatus({ status }: { status: string }) {
  const tone = financeStatusTone(status);
  const Icon = tone === "ok" ? CheckCircle2 : tone === "danger" ? AlertTriangle : CircleDashed;
  return (
    <span className={`badge ${tone}`}>
      <Icon size={11} aria-hidden />
      {financeStatusLabel(status)}
    </span>
  );
}
