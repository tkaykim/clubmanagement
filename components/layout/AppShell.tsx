"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileHeader } from "./MobileHeader";
import { MobileDrawer } from "./MobileDrawer";
import { BottomNav } from "./BottomNav";
import { Fab } from "./Fab";
import { PWABanner } from "./PWABanner";
import type { CrewMember } from "@/lib/types";

interface CountsShape {
  projects?: number;
  unreadAnn?: number;
  myPending?: number;
  newInquiry?: number;
}

interface AppShellProps {
  children: React.ReactNode;
  me: CrewMember | null;
  isAdmin: boolean;
  crumb?: string;
  // 초기 SSR에서 비워두고 클라이언트에서 fetch (탭 전환 지연 제거).
  initialCounts?: CountsShape;
}

const COUNTS_CACHE_KEY = "oc.counts.v1";
const COUNTS_TTL_MS = 5_000;

function readCachedCounts(): CountsShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COUNTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: CountsShape };
    if (Date.now() - parsed.ts > COUNTS_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedCounts(data: CountsShape) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      COUNTS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

export function AppShell({ children, me, isAdmin, crumb, initialCounts }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [counts, setCounts] = useState<CountsShape>(
    () => initialCounts ?? readCachedCounts() ?? {}
  );

  useEffect(() => {
    let aborted = false;

    // 캐시가 신선하면 fetch 스킵
    const cached = readCachedCounts();
    if (cached) {
      setCounts(cached);
    }

    // PWA cold start 직후엔 access_token 만료로 첫 호출이 401 일 수 있다.
    // 그 경우 refreshSession() 1회 후 재시도 → race 한 번에 무너지지 않도록 한다.
    async function loadCounts() {
      try {
        let res = await fetch("/api/me/counts", { credentials: "include" });
        if (res.status === 401) {
          try {
            await supabase.auth.refreshSession();
          } catch {
            // 영구 실패면 재시도해도 401. 그냥 무시.
          }
          if (aborted) return;
          res = await fetch("/api/me/counts", { credentials: "include" });
        }
        if (!res.ok) return;
        const json = await res.json();
        if (aborted || !json?.data) return;
        setCounts(json.data);
        writeCachedCounts(json.data);
      } catch {
        // 네트워크 오류는 무시.
      }
    }
    void loadCounts();

    return () => {
      aborted = true;
    };
  }, []);

  return (
    <div className="app">
      {/* PC 사이드바 */}
      <Sidebar
        me={me}
        isAdmin={isAdmin}
        counts={counts}
        className="pc-only"
      />

      {/* 모바일 헤더 */}
      <MobileHeader
        title={crumb ?? "원샷크루"}
        onMenuClick={() => setDrawerOpen(true)}
      />

      {/* 모바일 드로어 */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        me={me}
        isAdmin={isAdmin}
        counts={counts}
      />

      {/* 메인 영역 */}
      <div className="main">
        {/* PC TopBar */}
        <TopBar crumb={crumb} isAdmin={isAdmin} />

        {/* 페이지 컨텐츠 */}
        {children}

        {/* 모바일 하단 여백 */}
        <div style={{ height: 84 }} className="mob-only" />
      </div>

      {/* 모바일 바텀 네비 */}
      <BottomNav counts={counts} />

      {/* 관리자 FAB (모바일) */}
      {isAdmin && <Fab />}

      {/* PWA 설치 배너 */}
      <PWABanner />
    </div>
  );
}
