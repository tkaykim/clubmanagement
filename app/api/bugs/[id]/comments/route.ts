import { NextResponse } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/auth";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase-server";
import { createBugReportCommentSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const sessionOrResponse = await requireAuth();
    if (isNextResponse(sessionOrResponse)) return sessionOrResponse;

    const body = await request.json();
    const parsed = createBugReportCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "댓글 내용을 확인해주세요" },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();
    const { data: member } = await supabase
      .from("crew_members")
      .select("name, stage_name, role, is_active")
      .eq("user_id", sessionOrResponse.userId)
      .maybeSingle();

    if (!member?.is_active) {
      return NextResponse.json(
        { error: "활성 멤버만 댓글을 남길 수 있습니다" },
        { status: 403 }
      );
    }

    const service = createServiceSupabaseClient();
    if (!service) {
      return NextResponse.json(
        { error: "댓글을 저장할 준비가 되지 않았습니다" },
        { status: 503 }
      );
    }

    const { data: report, error: reportError } = await service
      .from("bug_reports")
      .select("id, reporter_id")
      .eq("id", id)
      .maybeSingle();

    if (reportError) {
      console.error("[POST /api/bugs/[id]/comments] report error:", reportError);
      return NextResponse.json(
        { error: "제보 내용을 확인하지 못했습니다" },
        { status: 500 }
      );
    }
    if (!report) {
      return NextResponse.json(
        { error: "제보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const isStaff = member.role === "admin" || member.role === "owner";
    if (!isStaff && report.reporter_id !== sessionOrResponse.userId) {
      return NextResponse.json(
        { error: "이 제보에 댓글을 남길 수 없습니다" },
        { status: 403 }
      );
    }

    const authorName =
      (member.stage_name as string | null) ||
      (member.name as string | null) ||
      "원샷크루 멤버";

    const { data: comment, error: insertError } = await service
      .from("bug_report_comments")
      .insert({
        bug_report_id: id,
        author_id: sessionOrResponse.userId,
        author_name: authorName,
        author_kind: isStaff ? "staff" : "reporter",
        body: parsed.data.body,
      })
      .select()
      .single();

    if (insertError || !comment) {
      console.error("[POST /api/bugs/[id]/comments] insert error:", insertError);
      return NextResponse.json(
        { error: "댓글 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/bugs/[id]/comments] error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
