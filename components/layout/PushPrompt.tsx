"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

type State = "loading" | "unsupported" | "ios-not-installed" | "denied" | "default" | "subscribed";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  return isIOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari 전용 (navigator.standalone) + 표준 display-mode
  const std = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStd = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return !!(std || iosStd);
}

export function PushPrompt() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void check();
    // 탭이 다시 포커스될 때(다른 기기에서 상태 변경 가능) DB sync 재시도.
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 클라이언트 PushManager에는 endpoint가 있는데 DB upsert가 누락되는 케이스를 보정.
  // POST /api/push/subscribe는 endpoint 기준 onConflict upsert이므로 호출이 idempotent.
  async function ensureServerSync(sub: PushSubscription) {
    try {
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          ua: navigator.userAgent.slice(0, 500),
        }),
      });
    } catch (err) {
      console.warn("[PushPrompt] sync failed:", err);
    }
  }

  async function check() {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // iOS Safari 의 경우 PWA 미설치 상태에서는 PushManager 가 없음
      if (isIOSSafari() && !isStandalone()) {
        setState("ios-not-installed");
      } else {
        setState("unsupported");
      }
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      setState("subscribed");
      // 다른 사용자/세션에서 DB row가 사라졌을 수 있으니 매 진입마다 동기화.
      void ensureServerSync(sub);
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    setState("default");
  }

  async function enable() {
    setBusy(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("VAPID 키가 설정되지 않았습니다");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(publicKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          ua: navigator.userAgent.slice(0, 500),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "구독 등록에 실패했습니다");
        await sub.unsubscribe().catch(() => null);
        return;
      }
      toast.success("알림 받기를 시작했어요");
      setState("subscribed");
    } catch (err) {
      console.error(err);
      toast.error("알림 등록 중 오류가 발생했어요");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setState("default");
        return;
      }
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      toast.success("알림을 껐어요");
      setState("default");
    } catch (err) {
      console.error(err);
      toast.error("해제 중 오류가 발생했어요");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ padding: 18 }}>
        <div className="row gap-8 mb-8" style={{ alignItems: "center" }}>
          <Bell size={16} strokeWidth={2} />
          <div style={{ fontWeight: 600 }}>푸시 알림</div>
        </div>

        {state === "loading" && (
          <div className="text-xs muted">상태 확인 중…</div>
        )}

        {state === "unsupported" && (
          <div className="text-xs muted">이 브라우저에서는 푸시 알림을 지원하지 않아요.</div>
        )}

        {state === "ios-not-installed" && (
          <div className="text-xs muted">
            iPhone/iPad에서는 먼저 <b>홈 화면에 추가</b>한 뒤 설치된 앱에서 알림을 켤 수 있어요.<br />
            (Safari 공유 → 홈 화면에 추가)
          </div>
        )}

        {state === "denied" && (
          <div className="text-xs muted">
            브라우저에서 알림 권한이 차단되어 있어요. 설정에서 사이트 권한을 허용으로 바꿔주세요.
          </div>
        )}

        {state === "default" && (
          <div>
            <div className="text-xs muted mb-12">
              새로운 모집/공지/정산 소식을 알림으로 받을 수 있어요.
            </div>
            <button className="btn sm primary" onClick={enable} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} strokeWidth={2} />}
              알림 받기
            </button>
          </div>
        )}

        {state === "subscribed" && (
          <div>
            <div className="text-xs muted mb-12">이 기기에서 알림을 받고 있어요.</div>
            <button className="btn sm" onClick={disable} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} strokeWidth={2} />}
              알림 끄기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
