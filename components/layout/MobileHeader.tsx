"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileHeaderProps = {
  title: string;
  backHref?: string;
  className?: string;
};

export function MobileHeader({ title, backHref, className }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur-md supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]",
        className
      )}
      style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex justify-start">
          {backHref ? (
            <Link
              href={backHref}
              className="-ml-1 flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <ChevronLeft className="size-6" />
            </Link>
          ) : null}
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="size-10" />
      </div>
    </header>
  );
}
