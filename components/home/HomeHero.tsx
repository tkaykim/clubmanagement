"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function HomeHero() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ? { name: u.user_metadata?.name as string, email: u.email ?? undefined } : null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { name: session.user.user_metadata?.name as string, email: session.user.email ?? undefined }
          : null
      );
    });
    return () => subscription.unsubscribe();
  }, []);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "회원";

  return (
    <section className="px-5 pt-6 pb-8">
      <p className="text-xs font-medium uppercase tracking-wider text-primary">우동 - 우리들의 동아리</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {loading ? (
          "안녕하세요,"
        ) : user ? (
          <>
            <span className="text-primary">{displayName}</span>님,
            <br />
            안녕하세요
          </>
        ) : (
          <>
            안녕하세요,
            <br />
            <span className="text-primary">우리들의 동아리</span>와 함께해요
          </>
        )}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        동아리를 탐색하고, 공개 이벤트를 확인해 보세요.
      </p>
      {!loading && !user && (
        <p className="mt-3 text-sm text-muted-foreground">
          처음이신가요?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            회원가입
          </Link>
          하고 MBTI·관심사를 입력하면 맞춤 동아리를 추천받을 수 있어요.
        </p>
      )}
    </section>
  );
}
