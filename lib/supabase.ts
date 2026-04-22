import { createClient } from "@supabase/supabase-js";

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
  // 브라우저에서만 경고. throw 는 하지 않는다 (앱 전체 크래시 방지).
  console.error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 비어 있습니다. Vercel 의 Environment Variables 를 확인하고 재배포하세요."
  );
}

export const supabase = createClient(
  isInvalid ? "https://invalid.supabase.co" : supabaseUrl,
  isInvalid ? "invalid-key" : supabaseAnonKey
);
