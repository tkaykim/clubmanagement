import Link from "next/link";
import { Bell, Plus } from "lucide-react";

interface TopBarProps {
  crumb?: string;
  isAdmin: boolean;
}

export function TopBar({ crumb, isAdmin }: TopBarProps) {
  return (
    <header className="topbar pc-only">
      <span className="crumb">{crumb ?? "원샷크루"}</span>
      <div className="spacer" />
      {isAdmin && (
        <Link href="/manage/projects/new" className="btn primary">
          <Plus size={14} strokeWidth={2} />
          새 프로젝트
        </Link>
      )}
      <button className="btn icon-only" aria-label="알림">
        <Bell size={14} strokeWidth={2} />
      </button>
    </header>
  );
}
