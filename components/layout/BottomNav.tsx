"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Ticket, LayoutDashboard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/clubs", label: "동아리", icon: Users },
  { href: "/events", label: "이벤트", icon: Ticket },
  { href: "/dashboard", label: "마이", icon: LayoutDashboard },
  { href: "/calendar", label: "캘린더", icon: Calendar },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition-colors active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
