"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * PWA 환경 자동 로그아웃 완화용 클라이언트 컴포넌트.
 *
 * 문제 배경:
 *  - iOS PWA standalone 에서 백그라운드로 들어가면 JS 타이머가 정지 →
 *    @supabase/auth-helpers 의 autoRefreshToken 이 만료 직전 갱신을 못 한다.
 *  - 다시 앱을 열면 access_token 만료 + refresh_token 살아있음.
 *  - 동시에 여러 fetch / RSC payload 요청이 발사되면, middleware 가 각자 같은
 *    refresh_token 으로 갱신을 시도 → "Refresh Token Already Used" race.
 *  - 일부 요청이 실패하면 그 응답이 /login 리다이렉트 또는 401 로 떨어져
 *    사용자에겐 "자동 로그아웃" 으로 보인다.
 *
 * 처리:
 *  1) (main) 레이아웃 진입(앱 부팅) 시 1회 refreshSession() — 새 토큰 쿠키를 미리 확보.
 *  2) document.visibilitychange === 'visible' 마다 refreshSession() — 백그라운드 복귀 race 차단.
 *  3) onAuthStateChange 에서 INITIAL_SESSION/SIGNED_IN 시 noop. SIGNED_OUT 은 사용자 명시
 *     로그아웃 또는 refresh_token 영구 무효화일 때만 발생하므로 별도 처리 안 함.
 *
 * trade-off: 진입할 때마다 Supabase Auth 1회 추가 호출 (~수십~100ms).
 *            그 대신 cold-start race 거의 차단 → "본인이 누르기 전엔 안 끊김" 에 근접.
 */
export function SessionRefresher() {
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        // refreshSession 은 access_token 이 만료되지 않았으면 no-op 에 가까움.
        // 만료 임박/만료 시에만 refresh_token 으로 새 쌍을 발급한다.
        await supabase.auth.refreshSession();
      } catch (err) {
        // 영구 실패(refresh_token 자체가 만료/회수)면 아무 것도 하지 않는다.
        // 이 경우 다음 보호 페이지 fetch 에서 middleware 가 /login 으로 보낸다.
        console.warn("[SessionRefresher] refresh failed:", err);
      }
    }

    // 1) 앱 부팅 시 1회.
    void refresh();

    // 2) 가시성 복귀 시.
    const onVis = () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // 3) PWA 가 다시 포커스 받을 때(iOS 일부 케이스에서 visibilitychange 가 누락됨).
    const onFocus = () => {
      if (!cancelled) void refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
