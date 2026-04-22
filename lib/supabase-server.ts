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
 *
 * createBrowserClient 가 쓰는 청크 쿠키를 안전하게 다루려면 getAll/setAll API 가 필요.
 * Next.js 15+ 에서 cookies() 는 Promise 지만, 우리가 쓰는 경로는 read-only 가 대부분이므로
 * 동기 레퍼런스를 시도하고, 실패하면 anon 클라이언트로 폴백한다.
 */
export function createServerSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return createClient("https://invalid.supabase.co", "invalid-key", {
      auth: { persistSession: false },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers") as {
    cookies: () => {
      getAll: () => Array<{ name: string; value: string }>;
      set?: (opts: { name: string; value: string; [k: string]: unknown }) => void;
    };
  };

  let cookieStore: ReturnType<typeof cookies>;
  try {
    cookieStore = cookies();
  } catch {
    return createClient(url, anonKey, { auth: { persistSession: false } });
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        try {
          return cookieStore.getAll();
        } catch {
          return [];
        }
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set?.({ name, value, ...options });
          });
        } catch {
          // Server Component 에서 set 은 금지된다 (읽기 전용).
          // Route Handler / Server Action 에서만 동작한다. 무시해도 안전.
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
