// lib/availability-export.ts
// 가용성 3개 뷰(타임테이블 / 날짜별 취합 / 멤버 열지도) → XLSX 시트 데이터 변환.
// lib/availability 의 집계 로직을 재사용해 화면과 동일한 수치를 산출한다.

import {
  computeTimeRange,
  evaluateCell,
  minToHHMM,
  SLOT_SIZE_MIN,
  type VoteLite,
} from "@/lib/availability";
import type { XlsxSheet } from "@/lib/xlsx";
import type { TimeSlot, VoteStatus } from "@/lib/types";
import type { ScheduleCandidate } from "@/lib/availability-recommend";

export interface ExportApp {
  id: string;
  status: string; // pending | approved | rejected
  user_id: string | null;
  guest_name: string | null;
  crew_members: { name: string; stage_name: string | null } | null;
}

export interface ExportScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string; // practice | event
}

export interface ExportVoteRow {
  schedule_date_id: string;
  user_id: string;
  status: string;
  time_slots: TimeSlot[];
  note: string | null;
}

// ── 공통 헬퍼 ──────────────────────────────────────────────
function appName(a: ExportApp): string {
  const stage = a.crew_members?.stage_name?.trim();
  const real = a.crew_members?.name?.trim();
  return stage || real || a.guest_name || "지원자";
}

function dateHeader(d: ExportScheduleDate): string {
  const { day, dow, month } = kstDayDow(d.date);
  const kind = d.kind === "practice" ? "연습" : "본행사";
  const label = d.label ? ` ${d.label}` : "";
  return `${month}/${day}(${dow}) ${kind}${label}`;
}

function kstDayDow(dateStr: string): { day: number; dow: string; month: number } {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(`${dateStr}T00:00:00+09:00`));
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const dow = parts.find((p) => p.type === "weekday")?.value ?? "";
  return { day, dow, month };
}

function statusLabel(s: string | undefined): string {
  switch (s) {
    case "available": return "가능";
    case "partial": return "부분가능";
    case "adjustable": return "조정가능";
    case "unavailable": return "불가";
    default: return "미투표";
  }
}

function appStatusLabel(s: string): string {
  switch (s) {
    case "approved": return "확정";
    case "pending": return "검토중";
    case "rejected": return "탈락";
    default: return s;
  }
}

function slotsText(slots: TimeSlot[] | undefined): string {
  if (!slots || slots.length === 0) return "";
  return slots
    .map((t) => `${t.kind === "unavailable" ? "✕" : ""}${t.start}~${t.end}`)
    .join(", ");
}

// votes(list) → 날짜별 user_id → VoteLite
function buildVotesByDate(
  scheduleDates: ExportScheduleDate[],
  votes: ExportVoteRow[]
): Map<string, Map<string, VoteLite>> {
  const m = new Map<string, Map<string, VoteLite>>();
  for (const d of scheduleDates) m.set(d.id, new Map());
  for (const v of votes) {
    const bucket = m.get(v.schedule_date_id);
    if (!bucket) continue;
    bucket.set(v.user_id, {
      status: v.status as VoteStatus,
      time_slots: v.time_slots,
      note: v.note,
    });
  }
  return m;
}

// ── 1. 타임테이블 뷰 ──────────────────────────────────────
// 행: 30분 슬롯 / 열: 날짜 / 값: 가능자 수
export function buildTimetableSheets(
  scheduleDates: ExportScheduleDate[],
  pool: ExportApp[],
  votes: ExportVoteRow[]
): XlsxSheet[] {
  const allSlots: TimeSlot[] = [];
  for (const v of votes) for (const s of v.time_slots ?? []) allSlots.push(s);
  const range = computeTimeRange(allSlots);
  const votesByDate = buildVotesByDate(scheduleDates, votes);

  const header = [`시간 (가능자 수 / 전체 ${pool.length}명)`, ...scheduleDates.map(dateHeader)];
  const rows: (string | number)[][] = [header];

  for (let i = 0; i < range.totalSlots; i++) {
    const startLabel = minToHHMM(range.startMin + i * SLOT_SIZE_MIN);
    const endLabel = minToHHMM(range.startMin + (i + 1) * SLOT_SIZE_MIN);
    const row: (string | number)[] = [`${startLabel}~${endLabel}`];
    for (const d of scheduleDates) {
      const votesForDate = votesByDate.get(d.id) ?? new Map<string, VoteLite>();
      const cell = evaluateCell(i, pool, votesForDate, range.startMin, range.totalSlots);
      row.push(cell.avail.length);
    }
    rows.push(row);
  }

  return [{ name: "타임테이블", rows }];
}

// ── 2. 날짜별 취합 뷰 ──────────────────────────────────────
// 요약 시트 + 상세 시트
export function buildByDateSheets(
  scheduleDates: ExportScheduleDate[],
  pool: ExportApp[],
  votesByUser: Map<string, Map<string, ExportVoteRow>>
): XlsxSheet[] {
  type PerDate = {
    d: ExportScheduleDate;
    counts: Record<string, number>;
    score: number;
    members: Array<{
      name: string;
      appStatus: string;
      status: string;
      slots: string;
      note: string;
    }>;
  };

  const statusRank: Record<string, number> = {
    available: 0, partial: 1, adjustable: 2, unavailable: 3, none: 4,
  };

  const perDate: PerDate[] = scheduleDates.map((d) => {
    const counts: Record<string, number> = {
      available: 0, partial: 0, adjustable: 0, unavailable: 0, none: 0,
    };
    const members = pool.map((a) => {
      const v = a.user_id ? votesByUser.get(a.user_id)?.get(d.id) : undefined;
      const s = v ? v.status : "none";
      counts[s] = (counts[s] ?? 0) + 1;
      return {
        name: appName(a),
        appStatus: a.status,
        status: s,
        slots: slotsText(v?.time_slots),
        note: v?.note ?? "",
      };
    });
    const score =
      counts.available * 2 +
      counts.partial * 1 +
      counts.adjustable * 0.5 -
      counts.unavailable;
    return { d, counts, score, members };
  });

  const sorted = perDate.slice().sort((a, b) => b.score - a.score);

  // 요약 시트
  const summaryHeader = [
    "날짜", "종류", "라벨",
    "가능", "부분가능", "조정가능", "불가", "미투표",
    "참여(가능+부분+조정)", "전체", "점수",
  ];
  const summaryRows: (string | number)[][] = [summaryHeader];
  for (const p of sorted) {
    const join = p.counts.available + p.counts.partial + p.counts.adjustable;
    summaryRows.push([
      p.d.date,
      p.d.kind === "practice" ? "연습" : "본행사",
      p.d.label ?? "",
      p.counts.available,
      p.counts.partial,
      p.counts.adjustable,
      p.counts.unavailable,
      p.counts.none,
      join,
      p.members.length,
      p.score,
    ]);
  }

  // 상세 시트
  const detailHeader = [
    "날짜", "종류", "라벨", "이름", "지원상태", "가능여부", "가능시간대", "메모",
  ];
  const detailRows: (string | number)[][] = [detailHeader];
  for (const p of sorted) {
    const members = p.members
      .slice()
      .sort(
        (a, b) =>
          (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
          a.name.localeCompare(b.name, "ko")
      );
    for (const m of members) {
      detailRows.push([
        p.d.date,
        p.d.kind === "practice" ? "연습" : "본행사",
        p.d.label ?? "",
        m.name,
        appStatusLabel(m.appStatus),
        statusLabel(m.status),
        m.slots,
        m.note,
      ]);
    }
  }

  return [
    { name: "날짜별 요약", rows: summaryRows },
    { name: "날짜별 상세", rows: detailRows },
  ];
}

// ── 3. 멤버 열지도 뷰 ──────────────────────────────────────
// 행: 멤버 / 열: 날짜 / 값: 가능여부 (가능/부분가능/조정가능/불가/미투표)
export function buildHeatmapSheets(
  scheduleDates: ExportScheduleDate[],
  pool: ExportApp[],
  votesByUser: Map<string, Map<string, ExportVoteRow>>
): XlsxSheet[] {
  const header = ["이름", "지원상태", ...scheduleDates.map(dateHeader)];
  const rows: (string | number)[][] = [header];

  for (const a of pool) {
    const userVotes = a.user_id ? votesByUser.get(a.user_id) : undefined;
    const row: (string | number)[] = [appName(a), appStatusLabel(a.status)];
    for (const d of scheduleDates) {
      const v = userVotes?.get(d.id);
      row.push(statusLabel(v?.status));
    }
    rows.push(row);
  }

  return [{ name: "멤버 열지도", rows }];
}

// ── 4. 일정 추천 뷰 ────────────────────────────────────────
// 날짜별 최적 시간창 후보를 겹침 인원순으로 한 시트에 출력
export function buildRecommendSheets(
  candidates: ScheduleCandidate[]
): XlsxSheet[] {
  const names = (list: { name: string }[]) => list.map((m) => m.name).join(", ");
  const header = [
    "순위", "날짜", "종류", "라벨", "추천 시간대", "소요(분)",
    "겹침 인원", "확정가능", "부분가능(별도)", "조정가능(별도)", "빠지는 멤버",
  ];
  const rows: (string | number)[][] = [header];
  candidates.forEach((c, i) => {
    rows.push([
      i + 1,
      c.date,
      c.kind === "practice" ? "연습" : "본행사",
      c.label ?? "",
      `${c.startLabel}~${c.endLabel}`,
      c.durationMin,
      c.count,
      names(c.fullDay),
      names(c.partialIn),
      names(c.adjustable),
      names(c.missing),
    ]);
  });
  return [{ name: "일정 추천", rows }];
}
