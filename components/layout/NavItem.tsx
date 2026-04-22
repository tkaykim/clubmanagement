"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  count?: number;
  children: React.ReactNode;
  onClick?: () => void;
  /**
   * 하위 경로지만 이 항목으로 활성화돼서는 안 되는 prefix 목록.
   * 예: href="/manage" 인 "프로젝트 관리" 는 /manage/members 에서 활성화되면 안 됨.
   */
  exclude?: string[];
}

export function NavItem({ href, icon: Icon, count, children, onClick, exclude }: NavItemProps) {
  const pathname = usePathname();
  const isExcluded =
    exclude?.some((p) => pathname === p || pathname.startsWith(p + "/")) ?? false;
  const isActive =
    href === "/"
      ? pathname === "/"
      : !isExcluded && (pathname === href || pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      className={cn("nav-item", isActive && "active")}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={2} />
      <span>{children}</span>
      {count != null && count > 0 && (
        <span className="count">{count}</span>
      )}
    </Link>
  );
}
