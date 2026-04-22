"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { CrewMember } from "@/lib/types";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  me: CrewMember | null;
  isAdmin: boolean;
  counts?: {
    projects?: number;
    unreadAnn?: number;
    myPending?: number;
  };
}

export function MobileDrawer({ open, onClose, me, isAdmin, counts }: MobileDrawerProps) {
  const pathname = usePathname();

  // 라우트 변경 시 자동 닫기
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ESC 키 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="m-drawer-bg" onClick={onClose} aria-hidden />
      {/* 드로어 */}
      <div className="m-drawer" role="dialog" aria-modal="true" aria-label="메뉴">
        <div className="row" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            className="btn ghost icon-only sm"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <Sidebar
          me={me}
          isAdmin={isAdmin}
          counts={counts}
          onNavClick={onClose}
        />
      </div>
    </>
  );
}
