import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { signupSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const supabase = createRouteSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "회원가입에 실패했습니다" },
        { status: 400 }
      );
    }

    // users 테이블에 레코드 생성 (트리거가 없을 경우 직접 삽입)
    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        email,
        name,
        role: "member",
      });
    }

    return NextResponse.json({ data: { user: data.user } });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
