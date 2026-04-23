"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileHeader } from "./MobileHeader";
import { MobileDrawer } from "./MobileDrawer";
import { BottomNav } from "./BottomNav";
import { Fab } from "./Fab";
import { PWABanner } from "./PWABanner";
import type { CrewMember } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  me: CrewMember | null;
  isAdmin: boolean;
  crumb?: string;
  counts?: {
    projects?: number;
    unreadAnn?: number;
    myPending?: number;
    newInquiry?: number;
  };
}

export function AppShell({ children, me, isAdmin, crumb, counts = {} }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        unread={counts.unreadAnn}
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
