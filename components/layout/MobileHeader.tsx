"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileHeaderProps = {
  title: string;
  backHref?: string;
  /** 오른쪽에 표시할 버튼 등 (예: 동아리 만들기) */
  rightSlot?: React.ReactNode;
  className?: string;
};

export function MobileHeader({ title, backHref, rightSlot, className }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur-md supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]",
        className
      )}
      style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 justify-start">
          {backHref ? (
            <Link
              href={backHref}
              className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <ChevronLeft className="size-6" />
            </Link>
          ) : null}
        </div>
        <h1 className="truncate text-center text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="flex min-w-0 justify-end">{rightSlot ?? <div className="size-10" />}</div>
      </div>
    </header>
  );
}
