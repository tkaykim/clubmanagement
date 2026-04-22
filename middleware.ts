import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

/**
 * 인증 미들웨어
 * - /manage/* 경로: 인증 + admin/owner role 필요
 * - /apply/* 경로: 인증 없이 접근 가능 (게스트 지원 허용)
 * - 인증이 필요한 일반 페이지: 로그인 페이지로 리디렉션
 *
 * env 가 비어 있으면 미들웨어는 단순히 통과시킨다 (페이지/라우트 레벨에서 재확인).
 * 이렇게 해야 배포 구성 문제로 사이트 전체가 500 으로 다운되는 사태를 막는다.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    console.error(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다. Vercel > Settings > Environment Variables 를 확인한 뒤 재배포하세요."
    );
    return res;
  }

  // createBrowserClient 가 쓰는 청크 쿠키(sb-<ref>-auth-token.0, .1, ...)를
  // 안전하게 다루려면 getAll/setAll API 를 써야 한다.
  // 기존 get/set/remove 조합은 deprecated 이고 청크 5 개까지만 시도한다.
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // 서버사이드 JWT 재검증 (getSession 대신 getUser 사용 — 쿠키 위조 방지)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // 인증 경로는 통과
  const isAuthPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth");

  if (isAuthPath) return res;

  // 게스트 지원 경로는 통과 (공개 링크)
  if (pathname.startsWith("/apply/")) return res;

  // 비인증 상태에서 보호 경로 접근
  if (!authUser) {
    // API 라우트는 JSON 에러 반환
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    // 페이지는 로그인으로 리디렉션
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /manage/* 경로: admin/owner 확인
  if (pathname.startsWith("/manage")) {
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "관리자 권한이 필요합니다" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * 다음 경로는 미들웨어 제외 (정적/공개 자원):
     * - _next/static, _next/image, favicon.ico
     * - manifest.json, manifest.webmanifest, sw.js, robots.txt
     * - 이미지/폰트/정적 파일 확장자
     * 인증 리다이렉트가 이런 자원에 끼어들어 HTML 이 반환되면
     * manifest JSON 파싱 에러 / SW precache AbortError 가 발생하므로 반드시 제외한다.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|json|webmanifest|js|css|map|txt|xml)$).*)",
  ],
};
