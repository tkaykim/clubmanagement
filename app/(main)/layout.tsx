import { BottomNav } from "@/components/layout/BottomNav";
import { ActiveGuard } from "@/components/auth/ActiveGuard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveGuard>
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background">
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </ActiveGuard>
  );
}
