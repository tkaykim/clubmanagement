"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(
          authError.message.includes("Invalid")
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : authError.message
        );
        setLoading(false);
        return;
      }

      // createClientComponentClient 는 세션을 쿠키에 저장한다.
      // router.push 는 클라이언트 측 전환이라 middleware 의 쿠키 검사 타이밍이
      // 꼬이면 무한 리다이렉트로 보일 수 있으므로, full reload 로 홈으로 간다.
      // 로그인 후 기본 이동: 크루 대시보드.
      // "/" 는 공개 포트폴리오이므로 로그인 직후 가면 앱 내부에 못 들어간다.
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      const safeRedirect =
        redirect && redirect.startsWith("/") && redirect !== "/" ? redirect : "/dashboard";
      window.location.href = safeRedirect;
    } catch (err) {
      console.error("[login] unexpected error:", err);
      setError("로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>
          로그인
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">
              이메일 <span className="req">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">
              비밀번호 <span className="req">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="banner" style={{ marginBottom: 14, background: "var(--danger-bg)", border: "1px solid #FCA5A5", color: "var(--danger)" }}>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn primary w-full"
            style={{ width: "100%", justifyContent: "center", height: 42, fontSize: 14 }}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            fontSize: 12.5,
            color: "var(--mf)",
          }}
        >
          <span />
          <span>
            계정이 없으신가요?{" "}
            <Link href="/signup" style={{ color: "var(--fg)", fontWeight: 600, textDecoration: "none" }}>
              가입
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
