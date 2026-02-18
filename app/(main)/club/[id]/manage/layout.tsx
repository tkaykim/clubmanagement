import Link from "next/link";
import { Settings } from "lucide-react";

export default async function ClubManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur-md"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
      >
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href={`/clubs/${id}`}
            className="-ml-1 flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <span className="text-sm font-medium">뒤로</span>
          </Link>
          <h1 className="flex items-center justify-center gap-1.5 text-lg font-semibold text-foreground">
            <Settings className="size-5 text-primary" />
            동아리 관리
          </h1>
          <div className="size-10" />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
