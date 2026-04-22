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
  // 참여자 구분 칩 (리더/운영진/계약멤버/일반멤버/게스트)
  leader:           { label: "리더",     kind: "solid" },
  operator:         { label: "운영진",   kind: "info" },
  contract_member:  { label: "계약멤버", kind: "ok" },
  regular_member:   { label: "일반멤버", kind: "outline" },
  external_guest:   { label: "게스트",   kind: "warn" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const m = STATUS_MAP[status] ?? { label: status, kind: "" };
  return <span className={`badge ${m.kind}`}>{m.label}</span>;
}
