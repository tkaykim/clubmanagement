// lib/availability-recommend.ts
// "단일 최적 시간대 추천" 로직.
// 날짜별로 멤버들의 가능 시간을 30분 격자로 종합해, 가장 많은 멤버가 동시에 비는
// 연속 시간창(블록)을 찾아 후보로 만든다. 집계 기반은 lib/availability 재사용.
//
// 규칙(사용자 결정):
//  - 겹침 인원(headline count) = 확정 '가능'(available, 종일) 멤버만 카운트
//  - '부분가능'(partial) = 시간창을 전부 커버하는 멤버를 "별도 표기" (headline 미포함이 기본)
//  - '조정가능'(adjustable) = "별도 표기" (협의 필요)
//  - 블록 길이는 가변 (windowSlots, 30분 단위)

import { computeTimeRange, minToHHMM, toBitmap, SLOT_SIZE_MIN } from "@/lib/availability";
import type { TimeSlot } from "@/lib/types";

export interface RecApp {
  id: string;
  status: string;
  user_id: string | null;
  guest_name: string | null;
  crew_members: { name: string; stage_name: string | null } | null;
}

export interface RecScheduleDate {
  id: string;
  date: string;
  label: string | null;
  kind: string;
}

export interface RecVote {
  // ScheduleVoteRow / ExportVoteRow 와 구조 동일 (Map 불변성으로 인한 대입 호환 목적).
  // 실제 사용은 status / time_slots 뿐.
  schedule_date_id: string;
  user_id: string;
  status: string;
  time_slots: TimeSlot[];
  note: string | null;
}

export interface MemberLite {
  appId: string;
  name: string;
}

export interface ScheduleCandidate {
  dateId: string;
  date: string;
  label: string | null;
  kind: string;
  startMin: number;
  endMin: number;
  startLabel: string;
  endLabel: string;
  durationMin: number;
  count: number; // headline 겹침 인원 (includePartial 반영)
  fullDay: MemberLite[]; // 확정 '가능'(종일)
  partialIn: MemberLite[]; // 부분가능 중 이 블록 전체를 커버 (별도 표기)
  adjustable: MemberLite[]; // 조정가능 (별도 표기)
  missing: MemberLite[]; // 불가 / 미투표 / 블록 미커버
}

export interface RecommendInput {
  scheduleDates: RecScheduleDate[];
  pool: RecApp[];
  votesByUser: Map<string, Map<string, RecVote>>;
  windowSlots: number; // 30분 슬롯 개수 (>=1)
  includePartial: boolean;
}

function appName(a: RecApp): string {
  const stage = a.crew_members?.stage_name?.trim();
  const real = a.crew_members?.name?.trim();
  return stage || real || a.guest_name || "지원자";
}

type Classified =
  | { kind: "full"; m: MemberLite }
  | { kind: "partial"; m: MemberLite; bits: number[] }
  | { kind: "adjustable"; m: MemberLite }
  | { kind: "missing"; m: MemberLite };

function recommendForDate(
  date: RecScheduleDate,
  pool: RecApp[],
  votesByUser: Map<string, Map<string, RecVote>>,
  startMin: number,
  totalSlots: number,
  windowSlots: number,
  includePartial: boolean
): ScheduleCandidate {
  const members: Classified[] = pool.map((a) => {
    const m: MemberLite = { appId: a.id, name: appName(a) };
    const v = a.user_id ? votesByUser.get(a.user_id)?.get(date.id) : undefined;
    const status = v?.status ?? "none";
    if (status === "available") return { kind: "full", m };
    if (status === "adjustable") return { kind: "adjustable", m };
    if (status === "partial") {
      const bits = toBitmap(v?.time_slots ?? [], startMin, totalSlots);
      if (bits === null) return { kind: "missing", m };
      return { kind: "partial", m, bits };
    }
    return { kind: "missing", m }; // unavailable | none
  });

  const fullDay = members.filter((x) => x.kind === "full");
  const partials = members.filter(
    (x): x is Extract<Classified, { kind: "partial" }> => x.kind === "partial"
  );
  const adjustable = members.filter((x) => x.kind === "adjustable");

  const availAt = (c: Classified, slot: number): boolean => {
    if (c.kind === "full") return true;
    if (c.kind === "partial") return c.bits[slot] === 1;
    return false;
  };

  const L = Math.max(1, Math.min(windowSlots, totalSlots));
  const lastStart = Math.max(0, totalSlots - L);

  // 최적 시작점 선택: headline(확정/또는 확정+부분) 우선, 동률이면 부분가능 보너스로 결정
  let bestStart = 0;
  let bestScore = -1;
  for (let i = 0; i <= lastStart; i++) {
    const partialCover = partials.filter((p) => {
      for (let s = i; s < i + L; s++) if (p.bits[s] !== 1) return false;
      return true;
    });
    const headline = fullDay.length + (includePartial ? partialCover.length : 0);
    const score = headline * 1000 + partialCover.length; // 동률 tiebreak
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  // 최적 블록의 멤버 구성
  const partialCoverBest = partials.filter((p) => {
    for (let s = bestStart; s < bestStart + L; s++) if (p.bits[s] !== 1) return false;
    return true;
  });

  // targetSet = 이 블록에 동시에 비는 멤버(확정 종일 + 블록 커버 부분) → 좌우로 최대 확장
  const targetSet: Classified[] = [
    ...fullDay,
    ...partialCoverBest,
  ];
  let start = bestStart;
  let end = bestStart + L;
  // targetSet 이 비면(아무도 안 됨) 블록을 확장하지 않는다 — every([]) === true 로 전일 확장되는 것 방지
  if (targetSet.length > 0) {
    const allFreeAt = (slot: number) => targetSet.every((c) => availAt(c, slot));
    while (start - 1 >= 0 && allFreeAt(start - 1)) start--;
    while (end < totalSlots && allFreeAt(end)) end++;
  }

  const startMinAbs = startMin + start * SLOT_SIZE_MIN;
  const endMinAbs = startMin + end * SLOT_SIZE_MIN;

  const count = fullDay.length + (includePartial ? partialCoverBest.length : 0);
  const coveredIds = new Set(targetSet.map((c) => c.m.appId));
  const adjustableIds = new Set(adjustable.map((c) => c.m.appId));
  const missing = members
    .filter((c) => !coveredIds.has(c.m.appId) && !adjustableIds.has(c.m.appId))
    .map((c) => c.m);

  return {
    dateId: date.id,
    date: date.date,
    label: date.label,
    kind: date.kind,
    startMin: startMinAbs,
    endMin: endMinAbs,
    startLabel: minToHHMM(startMinAbs),
    endLabel: minToHHMM(endMinAbs),
    durationMin: endMinAbs - startMinAbs,
    count,
    fullDay: fullDay.map((c) => c.m),
    partialIn: partialCoverBest.map((c) => c.m),
    adjustable: adjustable.map((c) => c.m),
    missing,
  };
}

export function recommendSchedule(input: RecommendInput): ScheduleCandidate[] {
  const { scheduleDates, pool, votesByUser, windowSlots, includePartial } = input;

  // 전체 time_slots 로 공통 시간축 산출 (타임테이블과 동일 기준)
  const allSlots: TimeSlot[] = [];
  for (const byDate of votesByUser.values()) {
    for (const v of byDate.values()) {
      for (const s of v.time_slots ?? []) allSlots.push(s);
    }
  }
  const range = computeTimeRange(allSlots);

  const candidates = scheduleDates.map((d) =>
    recommendForDate(
      d,
      pool,
      votesByUser,
      range.startMin,
      range.totalSlots,
      windowSlots,
      includePartial
    )
  );

  // 겹침 인원 desc → (확정+부분) desc → 날짜 asc
  return candidates.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const ai = a.fullDay.length + a.partialIn.length;
    const bi = b.fullDay.length + b.partialIn.length;
    if (bi !== ai) return bi - ai;
    return a.date.localeCompare(b.date);
  });
}
