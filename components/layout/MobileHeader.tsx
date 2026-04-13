import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function MobileHeader({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur">
      {backHref && (
        <Link
          href={backHref}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <h1 className="truncate text-base font-semibold">{title}</h1>
    </header>
  );
}
