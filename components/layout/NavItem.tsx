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
}

export function NavItem({ href, icon: Icon, count, children, onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
