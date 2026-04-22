import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  ""
).trim();

const isInvalid =
  !supabaseUrl ||
  supabaseUrl.includes("your-project") ||
  !supabaseAnonKey;

if (isInvalid && typeof window !== "undefined") {
  console.error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 비어 있습니다. Vercel 의 Environment Variables 를 확인하고 재배포하세요."
  );
}

/**
 * 브라우저 전용 Supabase 클라이언트.
 *
 * createBrowserClient (@supabase/ssr 호환) 를 사용하는 이유:
 * - 세션을 쿠키(sb-<ref>-auth-token) 로 저장 → middleware 가 읽을 수 있다.
 * - 기본 createClient() 는 세션을 localStorage 에 저장하므로
 *   클라이언트에서 로그인해도 서버/middleware 는 인증 상태를 볼 수 없어
 *   "로그인 → / 로 이동 → middleware 가 쿠키 없음 판단 → /login 으로 리다이렉트"
 *   의 무한 루프가 발생한다.
 */
function makeClient(): SupabaseClient {
  if (isInvalid) {
    return createClient("https://invalid.supabase.co", "invalid-key", {
      auth: { persistSession: false },
    });
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey) as unknown as SupabaseClient;
}

// SSR 번들에서도 import 될 수 있으므로 lazy singleton 으로 만든다.
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) _client = makeClient();
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
}) as SupabaseClient;
