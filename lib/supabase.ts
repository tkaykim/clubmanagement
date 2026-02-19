import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim();
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
  const msg =
    "[Supabase] .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY(또는 PUBLISHABLE_DEFAULT_KEY)를 설정하세요. URL은 실제 프로젝트 주소(https://xxxx.supabase.co)여야 합니다. 수정 후 .next 삭제 후 개발 서버 재시작.";
  console.error(msg);
  throw new Error(msg);
}

export const supabase = createClient(
  isInvalid ? "https://invalid.supabase.co" : supabaseUrl,
  isInvalid ? "invalid-key" : supabaseAnonKey
);
