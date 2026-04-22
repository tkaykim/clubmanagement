import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isNextResponse } from "@/lib/auth";
import { createBugReportSchema } from "@/lib/validators";

/**
 * POST /api/bugs — 버그 제보 생성 (활성 멤버)
 */
export async function POST(request: Request) {
  try {
    const sessionOrResponse = await requireAuth();
    if (isNextResponse(sessionOrResponse)) return sessionOrResponse;
    const { userId } = sessionOrResponse;

    const body = await request.json();
    const parsed = createBugReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // 리포터 이름 스냅샷
    const { data: member } = await supabase
      .from("crew_members")
      .select("name, stage_name")
      .eq("user_id", userId)
      .maybeSingle();
    const reporterName =
      (member?.stage_name as string | undefined) ||
      (member?.name as string | undefined) ||
      null;

    const { data, error } = await supabase
      .from("bug_reports")
      .insert({
        reporter_id: userId,
        reporter_name: reporterName,
        title: parsed.data.title,
        description: parsed.data.description,
        severity: parsed.data.severity,
        page_url: parsed.data.page_url ?? null,
        user_agent: parsed.data.user_agent ?? null,
        viewport: parsed.data.viewport ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("[POST /api/bugs] insert error:", error);
      return NextResponse.json(
        { error: "제보 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/bugs] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bugs — 버그 목록 조회 (admin 전체 / 그 외 본인 것만)
 */
export async function GET(request: Request) {
  try {
    const sessionOrResponse = await requireAuth();
    if (isNextResponse(sessionOrResponse)) return sessionOrResponse;

    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "true";
    const status = searchParams.get("status");

    const supabase = createRouteSupabaseClient();
    let query = supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (mine) {
      query = query.eq("reporter_id", sessionOrResponse.userId);
    } else {
      // admin 만 전체 조회 가능 — 권한 체크
      const adminOrResponse = await requireAdmin();
      if (isNextResponse(adminOrResponse)) return adminOrResponse;
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[GET /api/bugs] select error:", error);
      return NextResponse.json(
        { error: "목록 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/bugs] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
