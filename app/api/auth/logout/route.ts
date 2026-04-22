import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = createRouteSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json(
        { error: "로그아웃에 실패했습니다" },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
