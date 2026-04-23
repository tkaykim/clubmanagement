import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

// zod import pattern matches lib/validators.ts — reuse granular schemas inline so
// we don't accidentally loosen 본인 경로의 strict 검증.
const timeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식이어야 합니다"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식이어야 합니다"),
  kind: z.enum(["available", "unavailable"]).optional().default("available"),
});

const voteStatusSchema = z.enum([
  "available",
  "partial",
  "adjustable",
  "unavailable",
]);

const adminVotesUpsertSchema = z.object({
  votes: z.record(
    z.string().uuid(),
    z
      .object({
        status: voteStatusSchema,
        time_slots: z.array(timeSlotSchema).optional().default([]),
        note: z.string().max(500).nullable().optional(),
      })
      .refine(
        (v) => v.status !== "partial" || (v.time_slots?.length ?? 0) > 0,
        { message: "부분가능은 가능한 시간대를 최소 1개 지정해주세요" }
      )
  ),
});

type Params = { params: Promise<{ id: string; userId: string }> };

/**
 * PATCH /api/projects/[id]/votes/[userId]
 * 관리자(활성 owner/admin)가 특정 사용자의 schedule_votes 를 업서트한다.
 * - 대상 사용자는 해당 프로젝트에 실제 지원(project_applications)한 사람이어야 함
 * - RLS 는 013_admin_vote_write.sql 의 votes_admin_* 정책으로 허용됨
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: projectId, userId } = await params;

    const admin = await requireAdmin();
    if (isNextResponse(admin)) return admin;

    const body = await request.json();
    const parsed = adminVotesUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { votes } = parsed.data;
    const supabase = createRouteSupabaseClient();

    // 대상 지원자가 실제 이 프로젝트에 지원했는지 확인
    const { data: app, error: appError } = await supabase
      .from("project_applications")
      .select("id, user_id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (appError) {
      console.error("[PATCH admin votes] app lookup error:", appError);
      return NextResponse.json({ error: "조회에 실패했습니다" }, { status: 500 });
    }
    if (!app) {
      return NextResponse.json(
        { error: "해당 사용자의 지원 내역이 없습니다" },
        { status: 404 }
      );
    }

    // schedule_date_id 가 이 프로젝트 소속인지 검증 (타 프로젝트 id 주입 방지)
    const dateIds = Object.keys(votes);
    if (dateIds.length === 0) {
      return NextResponse.json({ data: { updated: 0 } });
    }
    const { data: projectDates } = await supabase
      .from("schedule_dates")
      .select("id")
      .eq("project_id", projectId)
      .in("id", dateIds);
    const validIds = new Set((projectDates ?? []).map((d: { id: string }) => d.id));
    const invalid = dateIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "프로젝트와 무관한 일정 id 가 포함되었습니다" },
        { status: 400 }
      );
    }

    const voteRows = Object.entries(votes).map(([scheduleDateId, v]) => ({
      schedule_date_id: scheduleDateId,
      user_id: userId,
      status: v.status,
      time_slots: v.time_slots ?? [],
      note: v.note ?? null,
      updated_by: admin.user_id,
    }));

    const { error: upsertError } = await supabase
      .from("schedule_votes")
      .upsert(voteRows, { onConflict: "schedule_date_id,user_id" });

    if (upsertError) {
      console.error("[PATCH admin votes] upsert error:", upsertError);
      return NextResponse.json(
        { error: "가능시간 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    revalidatePath(`/manage/projects/${projectId}`);
    return NextResponse.json({ data: { updated: voteRows.length } });
  } catch (err) {
    console.error("[PATCH admin votes] unexpected error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
