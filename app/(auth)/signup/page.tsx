"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2, Clock } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--warn-bg)", margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Clock size={24} style={{ color: "var(--warn)" }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>가입 신청 완료</h2>
        <p style={{ fontSize: 13, color: "var(--mf)", lineHeight: 1.7, marginBottom: 20 }}>
          가입 신청이 접수되었습니다.<br />
          관리자 승인 후 이용하실 수 있습니다.
        </p>
        <div className="banner soft" style={{ marginBottom: 20, textAlign: "left" }}>
          <Clock size={16} style={{ color: "var(--warn)", flexShrink: 0 }} />
          <span style={{ fontSize: 12.5 }}>가입 승인을 기다리고 있어요. 관리자 확인 후 이용 가능합니다.</span>
        </div>
        <button className="btn sm ghost" onClick={() => router.push("/login")}>
          로그인 페이지로
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em" }}>
          회원가입
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">
              이름 <span className="req">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

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
              <span className="hint">6자 이상</span>
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="banner" style={{ marginBottom: 14, background: "var(--danger-bg)", border: "1px solid #FCA5A5", color: "var(--danger)" }}>
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", height: 42, fontSize: 14 }}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "가입 중…" : "가입하기"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--mf)", textAlign: "right" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "var(--fg)", fontWeight: 600, textDecoration: "none" }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
