import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    ""
  );
}

/**
 * 서버 컴포넌트 / Route Handler용 Supabase 클라이언트.
 * 쿠키 접근은 동적으로 처리 (Next.js 15 호환).
 */
export function createServerSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return createClient("https://invalid.supabase.co", "invalid-key", {
      auth: { persistSession: false },
    });
  }

  // Next.js 15에서 cookies()는 Promise<ReadonlyRequestCookies>를 반환
  // createServerClient에 동기 getter 패턴으로 래핑
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers") as {
    cookies: () => { get: (name: string) => { value?: string } | undefined };
  };

  let cookieStore: { get: (name: string) => { value?: string } | undefined };
  try {
    cookieStore = cookies() as { get: (name: string) => { value?: string } | undefined };
  } catch {
    return createClient(url, anonKey, { auth: { persistSession: false } });
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        try {
          return cookieStore.get(name)?.value;
        } catch {
          return undefined;
        }
      },
    },
  });
}

/**
 * Route Handler용 Supabase 클라이언트 (createServerSupabaseClient와 동일).
 */
export function createRouteSupabaseClient(): SupabaseClient {
  return createServerSupabaseClient();
}

/**
 * 관리 전용 service-role 클라이언트 (RLS 우회).
 * 시드 스크립트, 관리 작업 전용.
 */
export function createServiceSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
