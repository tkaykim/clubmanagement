"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/");
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
