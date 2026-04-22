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
 * Next.js 15+ 에서 cookies() 는 Promise 를 반환한다.
 * @supabase/ssr 의 getAll/setAll 콜백은 이미 async 로 호출되므로
 * 내부에서 await 로 cookies() 를 언래핑하면 된다.
 *
 * 기존 async createServerSupabaseClient 로 바꾸는 대신 동기 팩토리를 유지하고
 * 콜백만 async 로 두어 44 개 호출자를 그대로 둘 수 있다.
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
    cookies: () => Promise<{
      getAll: () => Array<{ name: string; value: string }>;
      set?: (opts: { name: string; value: string; [k: string]: unknown }) => void;
    }>;
  };

  return createServerClient(url, anonKey, {
    cookies: {
      async getAll() {
        try {
          const store = await cookies();
          return store.getAll();
        } catch {
          return [];
        }
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookies();
          cookiesToSet.forEach(({ name, value, options }) => {
            store.set?.({ name, value, ...options });
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
