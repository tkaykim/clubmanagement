"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Folder, Sparkles, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "홈", icon: Home, key: "home" },
  { href: "/projects", label: "프로젝트", icon: Folder, key: "projects" },
  { href: "/apply", label: "지원", icon: Sparkles, key: "apply" },
  { href: "/calendar", label: "캘린더", icon: Calendar, key: "calendar" },
  { href: "/mypage", label: "마이", icon: User, key: "mypage" },
] as const;

interface MobileBottomNavProps {
  counts?: {
    myPending?: number;
  };
}

export function BottomNav({ counts = {} }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="m-bottom mob-only">
      {TABS.map(({ href, label, icon: Icon, key }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const count = key === "mypage" ? (counts.myPending ?? 0) : 0;

        return (
          <Link
            key={key}
            href={href}
            className={cn("tab", isActive && "on")}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
            {count > 0 && <span className="cnt">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
