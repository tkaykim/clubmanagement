import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

/**
 * 인증 미들웨어 (성능 최적화 버전)
 *
 * - 인증 여부 1차 판단은 Supabase 인증 쿠키 존재 여부로 빠르게 처리한다.
 *   (RSC prefetch 포함 모든 nav 요청에 미들웨어가 실행되므로 매번 Auth API 왕복은
 *    탭 전환 지연의 주범이다 — getUser 는 보호 페이지/서버 핸들러에서 수행.)
 * - /manage/* 진입 시에만 Supabase 호출로 admin/owner role 을 확인한다.
 * - 페이지/Route Handler 가 자체적으로 requireAuth/requireAdmin 으로 한 번 더
 *   재검증하므로 미들웨어의 1차 판단이 잘못되어도 보안 사고로 이어지지 않는다.
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

  // /manage/* 만 role 체크. 그 외엔 페이지/핸들러가 자체 검증.
  if (pathname.startsWith("/manage")) {
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
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

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
