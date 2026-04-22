"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, Loader2 } from "lucide-react";

type Status = "loading" | "active" | "inactive" | "anonymous";

const PUBLIC_PATHS = ["/login", "/signup"];

export function ActiveGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        if (!cancelled) setStatus("active");
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setStatus("anonymous");
          return;
        }

        const { data: member } = await supabase
          .from("crew_members")
          .select("is_active")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled) {
          setStatus(member?.is_active ? "active" : "inactive");
        }
      } catch (err) {
        console.error("[ActiveGuard] auth check failed:", err);
        if (!cancelled) setStatus("anonymous");
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) check();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  // 익명 사용자 리다이렉트는 render 사이클이 아닌 effect 에서 처리.
  // render 중 router.replace 호출은 진행 중이던 내비게이션을 abort 시켜
  // "AbortError: signal is aborted without reason" 콘솔 에러의 원인이 된다.
  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "anonymous") {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--mf)" }} />
      </div>
    );
  }

  if (status === "inactive") {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--warn-bg)", margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clock size={28} style={{ color: "var(--warn)" }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>승인 대기 중</h1>
          <p style={{ fontSize: 13, color: "var(--mf)", lineHeight: 1.6, marginBottom: 20 }}>
            가입 신청이 접수되었습니다.<br />
            관리자 확인 후 이용할 수 있습니다.
          </p>
          <div className="banner soft" style={{ marginBottom: 16, justifyContent: "center" }}>
            <Clock size={16} style={{ color: "var(--warn)", flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>가입 승인을 기다리고 있어요. 관리자 확인 후 이용 가능합니다.</span>
          </div>
          <button
            className="btn ghost sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
