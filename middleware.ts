import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

/**
 * 인증 미들웨어
 *
 * 흐름:
 *   1) 쿠키 존재 여부로 1차 차단 (Auth API 왕복 없이 빠르게 미인증 차단).
 *   2) 보호 경로에 한해 supabase.auth.getUser() 를 호출 — JWT 검증과 동시에
 *      만료 access_token 을 refresh_token 으로 자동 갱신, 새 쿠키를 응답에 set.
 *      (이 단계가 없으면 1시간 만료 후 보호 페이지에서 server component 가
 *       토큰을 갱신해도 응답 쿠키에 반영되지 않아 로그아웃처럼 보이는 현상이
 *       PWA 환경에서 빈번하게 발생한다.)
 *   3) /manage/* 만 추가로 role 검사.
 *
 * trade-off: nav 마다 Auth API 1회 호출 → 자동 로그아웃 빈도 큰 폭 감소,
 *            응답 지연 ~수십~100ms.
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
      "[middleware] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다."
    );
    return res;
  }

  const { pathname } = req.nextUrl;

  // 인증 경로는 즉시 통과
  const isAuthPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth");
  if (isAuthPath) return res;

  // 공개 경로는 즉시 통과 (Supabase 호출 없음)
  if (pathname === "/") return res;
  if (pathname.startsWith("/apply/")) return res;
  if (pathname === "/api/portfolio/inquiries") return res;

  // 1차 인증 판단: Supabase 인증 쿠키 존재 여부 (Auth API 호출 없음)
  // 쿠키 이름 패턴: sb-<project-ref>-auth-token(.0|.1|...)
  const hasAuthCookie = req.cookies
    .getAll()
    .some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));

  if (!hasAuthCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 토큰 갱신 패스 — 모든 보호 경로에서 1회 getUser().
  // Supabase ssr 클라이언트는 access_token 만료 시 refresh_token 으로 새 토큰을
  // 발급하고 setAll 콜백을 통해 res 쿠키에 반영한다. 이게 자동 로그아웃 방지의 핵심.
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

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /manage/* 만 추가로 role 검사.
  if (pathname.startsWith("/manage")) {
    const { data: member } = await supabase
      .from("crew_members")
      .select("role")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (!member || (member.role !== "admin" && member.role !== "owner")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "관리자 권한이 필요합니다" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|json|webmanifest|js|css|map|txt|xml)$).*)",
  ],
};
