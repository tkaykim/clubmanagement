import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAuth, isNextResponse } from "@/lib/auth";
import { voteSubmitSchema, type VoteSubmitInput } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };
type VoteEntry = VoteSubmitInput["votes"][string];

/**
 * POST /api/projects/[id]/votes — 가용성 일괄 UPSERT (인증 필요)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const authOrResponse = await requireAuth();
    if (isNextResponse(authOrResponse)) return authOrResponse;
    const { userId } = authOrResponse;

    const body = await request.json();
    const parsed = voteSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    // 해당 프로젝트의 schedule_date_id 목록 검증
    const { data: validDates } = await supabase
      .from("schedule_dates")
      .select("id")
      .eq("project_id", projectId);

    const validDateIds = new Set((validDates ?? []).map((d) => d.id));

    const voteRows = Object.entries(parsed.data.votes)
      .filter(([dateId]) => validDateIds.has(dateId))
      .map(([scheduleDateId, rawVote]) => {
        const voteData = rawVote as VoteEntry;
        return {
          schedule_date_id: scheduleDateId,
          user_id: userId,
          status: voteData.status,
          time_slots: voteData.time_slots ?? [],
          note: voteData.note ?? null,
          updated_by: userId,
        };
      });

    if (voteRows.length === 0) {
      return NextResponse.json(
        { error: "유효한 날짜 ID가 없습니다" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("schedule_votes")
      .upsert(voteRows, { onConflict: "schedule_date_id,user_id" });

    if (error) {
      console.error("[POST /api/projects/[id]/votes] error:", error);
      return NextResponse.json(
        { error: "가능 일정 제출에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { upserted: voteRows.length } });
  } catch (err) {
    console.error("[POST /api/projects/[id]/votes] error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
