import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import type { User, CrewMember, UserRole } from "@/lib/types";

// 권한 판정 SSOT: crew_members.role
// 과거 users.role 과 crew_members.role 이 어긋난 이슈가 있었으므로
// 관리자/오너 판정은 crew_members 쪽을 신뢰한다.

// ============================================================
// Session helpers
// ============================================================

/**
 * 현재 Route Handler 요청에서 세션 사용자를 반환한다.
 * 인증되지 않은 경우 null 반환.
 */
export async function getSession(): Promise<{
  userId: string;
  email: string;
} | null> {
  const supabase = createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { userId: user.id, email: user.email ?? "" };
}

// ============================================================
// Auth guards (Route Handler 전용)
// ============================================================

/**
 * 인증 체크. 미인증이면 401 NextResponse를 반환한다.
 * 정상이면 { userId, email } 반환.
 */
export async function requireAuth(): Promise<
  | { userId: string; email: string }
  | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다" },
      { status: 401 }
    );
  }
  return session;
}

/**
 * 인증 + 현재 사용자의 users 테이블 row 조회.
 * 미인증이면 401, 존재하지 않으면 404 반환.
 */
export async function getCurrentUser(): Promise<User | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const supabase = createRouteSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다" },
      { status: 404 }
    );
  }
  return data as User;
}

/**
 * 인증 + crew_members.role 이 admin 또는 owner 인지 확인.
 * 미인증이면 401, 권한 없으면 403 반환.
 * 정상이면 CrewMember 반환.
 */
export async function requireAdmin(): Promise<CrewMember | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const supabase = createRouteSupabaseClient();
  const { data } = await supabase
    .from("crew_members")
    .select("*")
    .eq("user_id", session.userId)
    .maybeSingle();
  const member = data as CrewMember | null;
  if (!member || (member.role !== "admin" && member.role !== "owner")) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다" },
      { status: 403 }
    );
  }
  return member;
}

/**
 * 인증 + crew_members.role 이 owner 인지 확인.
 * 미인증이면 401, 권한 없으면 403 반환.
 * 정상이면 CrewMember 반환.
 */
export async function requireOwner(): Promise<CrewMember | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const supabase = createRouteSupabaseClient();
  const { data } = await supabase
    .from("crew_members")
    .select("*")
    .eq("user_id", session.userId)
    .maybeSingle();
  const member = data as CrewMember | null;
  if (!member || member.role !== "owner") {
    return NextResponse.json(
      { error: "오너 권한이 필요합니다" },
      { status: 403 }
    );
  }
  return member;
}

// ============================================================
// Crew member lookup
// ============================================================

/**
 * 현재 인증된 사용자의 crew_members 레코드를 조회한다.
 * 없으면 null 반환 (멤버 등록 전 상태).
 */
export async function getCurrentMember(): Promise<CrewMember | null> {
  const session = await getSession();
  if (!session) return null;
  const supabase = createRouteSupabaseClient();
  const { data } = await supabase
    .from("crew_members")
    .select("*")
    .eq("user_id", session.userId)
    .single();
  return data as CrewMember | null;
}

// ============================================================
// Type guard helpers
// ============================================================

export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "owner";
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
