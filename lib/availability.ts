import type { TimeSlot, VoteStatus } from "@/lib/types";

export const SLOT_SIZE_MIN = 30;

export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * time_slots 를 30분 단위 비트맵으로 변환한다.
 * - slots 가 비면: status 에 따라 "전 구간 가능/불가/조정" 으로 해석하라는 신호로 null 반환
 * - slots 에 kind="available" 가 하나라도 있으면: 기본 0, 해당 구간만 1
 * - 모두 kind="unavailable" 만 있으면: 기본 1, 해당 구간만 0
 */
export function toBitmap(
  slots: TimeSlot[],
  rangeStartMin: number,
  totalSlots: number
): number[] | null {
  if (!slots || slots.length === 0) return null;
  const anyAvailable = slots.some((s) => (s.kind ?? "available") === "available");
  const bits = new Array<number>(totalSlots).fill(anyAvailable ? 0 : 1);
  for (const s of slots) {
    const kind = s.kind ?? "available";
    const from = Math.max(
      0,
      Math.floor((hhmmToMin(s.start) - rangeStartMin) / SLOT_SIZE_MIN)
    );
    const to = Math.min(
      totalSlots,
      Math.ceil((hhmmToMin(s.end) - rangeStartMin) / SLOT_SIZE_MIN)
    );
    for (let i = from; i < to; i++) bits[i] = kind === "available" ? 1 : 0;
  }
  return bits;
}

/**
 * 프로젝트 전체 time_slots 로부터 타임테이블 세로축 범위를 결정.
 * - 하나라도 slot 있으면 min/max 를 30분 단위로 스냅
 * - 아무도 slot 을 안 넣었으면 기본 09:00~22:00
 * 경계 보호: 최소 6시간 폭 유지
 */
export function computeTimeRange(allSlots: TimeSlot[]): {
  startMin: number;
  endMin: number;
  totalSlots: number;
} {
  const defaults = { startMin: 9 * 60, endMin: 22 * 60 };
  if (!allSlots || allSlots.length === 0) {
    const totalSlots = (defaults.endMin - defaults.startMin) / SLOT_SIZE_MIN;
    return { ...defaults, totalSlots };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const s of allSlots) {
    const a = hhmmToMin(s.start);
    const b = hhmmToMin(s.end);
    if (a < min) min = a;
    if (b > max) max = b;
  }
  // 30분 경계로 스냅
  const startMin = Math.floor(min / SLOT_SIZE_MIN) * SLOT_SIZE_MIN;
  let endMin = Math.ceil(max / SLOT_SIZE_MIN) * SLOT_SIZE_MIN;
  if (endMin - startMin < 6 * 60) endMin = startMin + 6 * 60;
  const totalSlots = (endMin - startMin) / SLOT_SIZE_MIN;
  return { startMin, endMin, totalSlots };
}

export type VoteLite = {
  status: VoteStatus;
  time_slots: TimeSlot[];
  note: string | null;
};

export type CellBucket = {
  avail: string[]; // applicationId list
  adjust: string[];
  unavail: string[];
  none: string[];
};

/**
 * 특정 (날짜, 30분 슬롯 인덱스) 셀에서 풀 내 각 멤버가 어떤 상태인지 집계.
 * - idToLabel: applicationId → 표시 이름 (pool 외부에서 미리 준비)
 */
export function evaluateCell(
  slotIdx: number,
  pool: Array<{ id: string; user_id: string | null }>,
  votesForDate: Map<string, VoteLite> /* user_id → vote */,
  rangeStartMin: number,
  totalSlots: number
): CellBucket {
  const out: CellBucket = { avail: [], adjust: [], unavail: [], none: [] };
  for (const app of pool) {
    if (!app.user_id) {
      out.none.push(app.id);
      continue;
    }
    const v = votesForDate.get(app.user_id);
    if (!v) {
      out.none.push(app.id);
      continue;
    }
    if (v.status === "available") {
      out.avail.push(app.id);
    } else if (v.status === "adjustable") {
      out.adjust.push(app.id);
    } else if (v.status === "unavailable") {
      out.unavail.push(app.id);
    } else {
      // partial
      const bits = toBitmap(v.time_slots, rangeStartMin, totalSlots);
      if (bits === null) {
        // partial 인데 slot 이 없으면 잘못된 상태 — 불가로 취급
        out.unavail.push(app.id);
      } else {
        out.avail.push(...(bits[slotIdx] === 1 ? [app.id] : []));
        if (bits[slotIdx] !== 1) out.unavail.push(app.id);
      }
    }
  }
  return out;
}

/**
 * 한 날짜에 대해 모든 slotIdx 의 avail 비율을 구한 뒤, 비율이 최대인 연속 구간을 찾는다.
 * 최대치가 0 이면 반환 안 함. 여러 구간이 동일 최대치면 가장 긴 것 1개.
 */
export function findBestContiguousRange(
  ratios: number[]
): { from: number; to: number } | null {
  let max = 0;
  for (const r of ratios) if (r > max) max = r;
  if (max <= 0) return null;
  let best: { from: number; to: number; len: number } | null = null;
  let cur: { from: number } | null = null;
  for (let i = 0; i < ratios.length; i++) {
    const isMax = ratios[i] >= max - 1e-9;
    if (isMax) {
      if (!cur) cur = { from: i };
    } else {
      if (cur) {
        const len = i - cur.from;
        if (!best || len > best.len) best = { from: cur.from, to: i, len };
        cur = null;
      }
    }
  }
  if (cur) {
    const len = ratios.length - cur.from;
    if (!best || len > best.len) best = { from: cur.from, to: ratios.length, len };
  }
  return best ? { from: best.from, to: best.to } : null;
}
