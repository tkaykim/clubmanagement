const STATUS_MAP: Record<string, { label: string; kind: string }> = {
  recruiting:   { label: "모집중",   kind: "solid" },
  selecting:    { label: "선별중",   kind: "warn" },
  in_progress:  { label: "진행중",   kind: "ok" },
  completed:    { label: "완료",     kind: "outline" },
  cancelled:    { label: "취소",     kind: "danger" },
  pending:      { label: "대기",     kind: "warn" },
  approved:     { label: "확정",     kind: "ok" },
  rejected:     { label: "탈락",     kind: "danger" },
  available:    { label: "가능",     kind: "ok" },
  unavailable:  { label: "불가",     kind: "danger" },
  maybe:        { label: "부분",     kind: "warn" },
  paid_gig:     { label: "유료행사", kind: "solid" },
  practice:     { label: "연습",     kind: "outline" },
  audition:     { label: "오디션",   kind: "info" },
  workshop:     { label: "워크숍",   kind: "outline" },
  paid:         { label: "지급완료", kind: "ok" },
  scheduled:    { label: "예정",     kind: "info" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const m = STATUS_MAP[status] ?? { label: status, kind: "" };
  return <span className={`badge ${m.kind}`}>{m.label}</span>;
}
