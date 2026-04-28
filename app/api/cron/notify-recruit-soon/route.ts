import { NextResponse } from "next/server";
import { createServiceSupabaseClient, createRouteSupabaseClient } from "@/lib/supabase-server";
import { notifyVisibility } from "@/lib/notifications";

/**
 * GET /api/cron/notify-recruit-soon
 * Vercel Cron 으로 매 10분 호출 → 모집 시작 5h/1h 전 알림.
 *
 * 멱등성: 알림 tag 를 deterministic 하게 구성하여 푸시 서비스가 dedup 한다.
 *   tag = `recruit-soon-{projectId}-{bucket}` (bucket: 5h, 1h)
 * 또한 발송 후 활동로그(action='push.send', meta.cron=true) 로 중복 검사 가능.
 *
 * 인증: CRON_SECRET 가 설정되어 있으면 Authorization: Bearer <CRON_SECRET> 검증.
 *       Vercel Cron 은 자동으로 인증 헤더를 붙임.
 */
export const dynamic = "force-dynamic";

const FIVE_HOURS_MIN = 4 * 60 + 50; // 4h50m ~ 5h10m 윈도우
const FIVE_HOURS_MAX = 5 * 60 + 10;
const ONE_HOUR_MIN = 50;
const ONE_HOUR_MAX = 70;

function diffMinutes(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / (60 * 1000));
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // service_role 우선 (RLS 우회), 없으면 일반 client
  const supabase = createServiceSupabaseClient() ?? createRouteSupabaseClient();
  const now = new Date();

  // 향후 6시간 내 모집 시작 예정 프로젝트
  const horizon = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const { data: candidates, error } = await supabase
    .from("projects")
    .select("id, title, visibility, owner_id, recruitment_start_at, status")
    .not("recruitment_start_at", "is", null)
    .gte("recruitment_start_at", now.toISOString())
    .lte("recruitment_start_at", horizon.toISOString())
    .neq("status", "cancelled");

  if (error) {
    console.error("[cron/notify-recruit-soon] query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    title: string;
    visibility: string;
    owner_id: string | null;
    recruitment_start_at: string;
  };
  const rows = (candidates ?? []) as Row[];

  let dispatched5h = 0;
  let dispatched1h = 0;

  for (const p of rows) {
    const start = new Date(p.recruitment_start_at);
    const minsLeft = diffMinutes(start, now);

    if (minsLeft >= FIVE_HOURS_MIN && minsLeft <= FIVE_HOURS_MAX) {
      await notifyVisibility(
        { id: p.id, visibility: p.visibility, owner_id: p.owner_id },
        {
          title: "모집 시작 5시간 전",
          body: `${p.title} · ${start.toLocaleString("ko-KR")} 시작`,
          url: `/projects/${p.id}`,
          tag: `recruit-soon-${p.id}-5h`,
        }
      );
      dispatched5h += 1;
    } else if (minsLeft >= ONE_HOUR_MIN && minsLeft <= ONE_HOUR_MAX) {
      await notifyVisibility(
        { id: p.id, visibility: p.visibility, owner_id: p.owner_id },
        {
          title: "모집 시작 1시간 전",
          body: `${p.title} · ${start.toLocaleString("ko-KR")} 시작 — 곧 열려요`,
          url: `/projects/${p.id}`,
          tag: `recruit-soon-${p.id}-1h`,
        }
      );
      dispatched1h += 1;
    }
  }

  return NextResponse.json({
    data: {
      checked: rows.length,
      dispatched5h,
      dispatched1h,
      now: now.toISOString(),
    },
  });
}
