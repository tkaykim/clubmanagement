import { NextResponse } from "next/server";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioInquiryInputSchema } from "@/lib/validators";

// IP 기반 인메모리 쿨다운 (프로덕션은 Upstash/KV 권장)
// 모듈 수명 동안 유지되며, 서버리스 환경에서는 인스턴스별로 독립 동작
const ipCooldown = new Map<string, number>();
const IP_COOLDOWN_MS = 30_000; // 30초
const IP_CLEANUP_MS = 60 * 60 * 1000; // 1시간 이상 된 항목 lazy 삭제

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function cleanupStaleEntries() {
  const now = Date.now();
  for (const [ip, ts] of ipCooldown) {
    if (now - ts > IP_CLEANUP_MS) ipCooldown.delete(ip);
  }
}

/**
 * POST /api/portfolio/inquiries — 문의 제출 (public, 비로그인 가능)
 * service_role 사용 금지: anon RLS(portfolio_inquiries_anyone_insert)를 통해 INSERT되어야 함.
 * createRouteSupabaseClient()는 anon/세션 기반 클라이언트 — RLS가 올바르게 적용됨.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // honeypot: _hp 필드에 값이 있으면 봇 — 조용히 200 반환
    if (body._hp) {
      return NextResponse.json({ data: {} });
    }

    // IP 기반 쿨다운 체크 (30초)
    const ip = getClientIp(request);
    const lastSubmit = ipCooldown.get(ip) ?? 0;
    if (Date.now() - lastSubmit < IP_COOLDOWN_MS) {
      // 쿨다운 중: 봇과 동일하게 조용히 200 반환 (정보 노출 금지)
      return NextResponse.json({ data: {} });
    }
    ipCooldown.set(ip, Date.now());
    cleanupStaleEntries();

    const parsed = portfolioInquiryInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // INSERT 는 anon RLS(portfolio_inquiries_anyone_insert)로 허용되지만
    // RETURNING 을 위한 SELECT 권한은 없다. 서비스 롤이 설정되어 있으면
    // 서비스 롤로 INSERT+SELECT 하여 id 를 확보하고, 없으면 anon 으로 INSERT 만 수행.
    const service = createServiceSupabaseClient();
    const supabase = service ?? createRouteSupabaseClient();

    const insertRow = { ...parsed.data, status: "new" as const };

    let insertedId: string | null = null;
    if (service) {
      const { data, error } = await service
        .from("portfolio_inquiries")
        .insert(insertRow)
        .select("id")
        .single();
      if (error || !data) {
        console.error("[POST /api/portfolio/inquiries] insert error:", error);
        return NextResponse.json({ error: "문의 제출에 실패했습니다" }, { status: 500 });
      }
      insertedId = data.id as string;
    } else {
      const { error } = await supabase
        .from("portfolio_inquiries")
        .insert(insertRow);
      if (error) {
        console.error("[POST /api/portfolio/inquiries] insert error:", error);
        return NextResponse.json({ error: "문의 제출에 실패했습니다" }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { id: insertedId } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/portfolio/inquiries] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * GET /api/portfolio/inquiries — 문의 목록 (admin, 페이지네이션)
 * Query: status?, page?, limit?
 */
export async function GET(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const supabase = createRouteSupabaseClient();

    let query = supabase
      .from("portfolio_inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: "문의 목록 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      meta: { total: count ?? 0, page, limit },
    });
  } catch (err) {
    console.error("[GET /api/portfolio/inquiries] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
