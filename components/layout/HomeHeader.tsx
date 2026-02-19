"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export function HomeHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-md"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-foreground">우동</span>
        <span className="text-xs text-muted-foreground">우리들의 동아리</span>
      </Link>
      <div className="flex items-center gap-2">
        {loading ? null : user ? (
          <>
            <span className="max-w-[120px] truncate text-sm text-muted-foreground">
              {(user.user_metadata?.name as string) || user.email?.split("@")[0] || "회원"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-lg">
                회원가입
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
