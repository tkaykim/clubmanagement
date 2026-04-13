import Link from "next/link";

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="flex items-center">
        <span className="text-lg font-bold tracking-tight">원샷크루</span>
      </Link>
    </header>
  );
}
