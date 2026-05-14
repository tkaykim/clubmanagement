"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface MobileHeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export function MobileHeader({ title = "원샷크루", onMenuClick }: MobileHeaderProps) {
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
      <NotificationBell variant="mobile" />
    </header>
  );
}
