"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

type Status = "loading" | "active" | "inactive" | "anonymous";

const PUBLIC_PATHS = ["/login", "/signup"];

export function ActiveGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    async function check() {
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        setStatus("active");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("anonymous");
        return;
      }

      const { data: member } = await supabase
        .from("crew_members")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      setStatus(member?.is_active ? "active" : "inactive");
    }
    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (status === "inactive") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <Clock className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-lg font-bold">승인 대기 중</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            회원가입이 완료되었습니다.<br />
            리더의 승인 후 이용할 수 있습니다.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="text-sm text-primary hover:underline"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
