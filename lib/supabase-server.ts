import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버용 Supabase 클라이언트.
 * SUPABASE_SERVICE_ROLE_KEY가 있으면 service role 사용(전체 권한, 시드/관리).
 * 없으면 NEXT_PUBLIC_SUPABASE_ANON_KEY로 fallback → RLS 적용, 공개 데이터만 가능.
 */
export function createServerSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url) return null;
  const key = serviceKey || anonKey;
  if (!key) return null;
  return createClient(url, key);
}
