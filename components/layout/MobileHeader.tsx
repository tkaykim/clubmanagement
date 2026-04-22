"use client";

import { Bell, Menu } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
  unread?: number;
  onMenuClick: () => void;
}

export function MobileHeader({ title = "원샷크루", unread = 0, onMenuClick }: MobileHeaderProps) {
  return (
    <header className="m-header mob-only">
      <button
        className="icon-btn"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu size={18} strokeWidth={2} />
      </button>
      <img src="/icon-192.png" alt="원샷크루" />
      <div className="title">{title}</div>
      <button className="icon-btn" aria-label="알림">
        <Bell size={18} strokeWidth={2} />
        {unread > 0 && <span className="dot" aria-hidden />}
      </button>
    </header>
  );
}
