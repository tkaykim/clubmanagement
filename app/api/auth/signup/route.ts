import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { signupSchema } from "@/lib/validators";
import { notifyAdmins } from "@/lib/notifications";

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

    // public.users + public.crew_members 레코드는 auth.users 트리거(on_auth_user_created)가
    // 자동 생성한다 (crew_members 는 is_active=false 로 승인 대기).

    // P0 #1: 새 가입 신청 알림 (admin/owner)
    await notifyAdmins({
      title: "새 가입 신청",
      body: `${name}(${email}) 님이 가입을 신청했어요`,
      url: "/manage/members?tab=pending",
      tag: data.user?.id ? `signup-${data.user.id}` : undefined,
    });

    return NextResponse.json({ data: { user: data.user } });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
