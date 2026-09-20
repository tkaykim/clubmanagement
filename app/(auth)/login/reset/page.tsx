"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [updateMode, setUpdateMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const isUpdate = new URLSearchParams(window.location.search).get("mode") === "update";
    setUpdateMode(isUpdate);
    if (!isUpdate) { setReady(true); return; }
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setReady(Boolean(data.user) && !error);
      if (!data.user || error) setMessage("링크가 만료되었거나 유효하지 않습니다. 로그인 화면에서 새 링크를 요청해 주세요.");
      // 인증 토큰과 코드를 주소창에 남기지 않는다.
      window.history.replaceState({}, "", "/login/reset?mode=update");
    });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !ready) return;
    setMessage("");
    if (updateMode && (password.length < 12 || password !== confirmation)) {
      setMessage("비밀번호는 12자 이상으로 입력하고, 두 입력값을 같게 맞춰 주세요.");
      return;
    }
    setBusy(true);
    try {
      if (updateMode) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        window.location.replace("/login?password=updated");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login/reset?mode=update`,
        });
        if (error) throw error;
        setMessage("등록된 계정이면 해당 메일함으로 설정 링크가 전송됩니다. 메일함과 스팸함을 확인해 주세요.");
      }
    } catch {
      setMessage("요청을 처리하지 못했습니다. 잠시 후 다시 시도하거나 재무 담당자에게 문의해 주세요.");
    } finally { setBusy(false); }
  }

  return <div className="card" style={{ padding: 24 }}>
    <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{updateMode ? "새 비밀번호 설정" : "비밀번호 설정·재설정"}</h1>
    <p className="muted text-sm" style={{ marginBottom: 20 }}>본인의 계정 이메일을 사용하세요.<br />인증 링크와 비밀번호는 다른 사람에게 전달하지 마세요.</p>
    <form onSubmit={submit}>
      {updateMode ? <>
        <div className="field"><label htmlFor="new-password">새 비밀번호</label><input className="input" id="new-password" type="password" minLength={12} autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div className="field"><label htmlFor="confirm-password">새 비밀번호 확인</label><input className="input" id="confirm-password" type="password" minLength={12} autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
      </> : <div className="field"><label htmlFor="reset-email">계정 이메일</label><input className="input" id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>}
      {message && <p role="status" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>{message.replace(/\. /g, ".\n")}</p>}
      <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy || !ready}>{busy ? "처리 중…" : updateMode ? "비밀번호 저장" : "설정 링크 받기"}</button>
    </form>
    <Link href="/login" className="btn ghost" style={{ marginTop: 12 }}>로그인으로 돌아가기</Link>
  </div>;
}
