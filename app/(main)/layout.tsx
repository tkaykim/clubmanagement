import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* 모바일 앱 프레임: 최대 너비 제한, 세로 스크롤 영역 */}
      <div
        className="mx-auto min-h-[100dvh] max-w-[430px] overflow-hidden rounded-[2rem] bg-background shadow-xl sm:rounded-3xl"
        style={{
          minHeight: "100dvh",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)",
        }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
