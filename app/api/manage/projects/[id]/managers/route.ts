import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

type ManagerRow = { id: string; user_id: string; created_at: string; assigned_by: string | null };
type CrewLite = { user_id: string; name: string; stage_name: string | null; profile_image_url: string | null };

// GET /api/manage/projects/[id]/managers
// 해당 프로젝트의 '프로젝트 관리자' 목록 (운영진 전용).
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const auth = await requireAdmin();
    if (isNextResponse(auth)) return auth;

    const supabase = createRouteSupabaseClient();
    const { data: rows, error } = await supabase
      .from("project_managers")
      .select("id, user_id, created_at, assigned_by")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET managers]", error);
      return NextResponse.json({ error: "목록 조회에 실패했습니다" }, { status: 500 });
    }

    const managers = (rows ?? []) as ManagerRow[];
    const userIds = Array.from(new Set(managers.map((m) => m.user_id)));
    const crewMap = new Map<string, CrewLite>();
    if (userIds.length > 0) {
      const { data: crews } = await supabase
        .from("crew_members")
        .select("user_id, name, stage_name, profile_image_url")
        .in("user_id", userIds);
      for (const c of (crews ?? []) as CrewLite[]) crewMap.set(c.user_id, c);
    }

    const data = managers.map((m) => {
      const c = crewMap.get(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        created_at: m.created_at,
        name: c?.stage_name ?? c?.name ?? "멤버",
        profile_image_url: c?.profile_image_url ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET managers] ex:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

type PostBody = { crew_member_id?: string | null; user_id?: string | null };

// POST /api/manage/projects/[id]/managers
// 멤버를 해당 프로젝트의 '프로젝트 관리자'로 지정 (운영진 전용).
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const auth = await requireAdmin();
    if (isNextResponse(auth)) return auth;

    const body = (await request.json()) as PostBody;
    const supabase = createRouteSupabaseClient();

    let userId: string | null = body.user_id ?? null;
    if (!userId && body.crew_member_id) {
      const { data: cm } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("id", body.crew_member_id)
        .maybeSingle();
      userId = (cm?.user_id as string | null | undefined) ?? null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "지정할 멤버를 선택해주세요 (가입 계정이 연결된 멤버만 가능)" },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("project_managers")
      .insert({ project_id: projectId, user_id: userId, assigned_by: auth.user_id })
      .select("id")
      .single();

    if (error) {
      // unique(project_id, user_id) 위반
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 이 프로젝트의 관리자입니다" }, { status: 409 });
      }
      console.error("[POST managers]", error);
      return NextResponse.json({ error: "지정에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST managers] ex:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
