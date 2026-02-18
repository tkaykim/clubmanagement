"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export function AuthLinks() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) return null;
  if (user) {
    return (
      <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
        로그아웃
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      <Link href="/login" className="text-muted-foreground hover:text-foreground">로그인</Link>
      <span className="text-muted-foreground/60">|</span>
      <Link href="/signup" className="font-medium text-primary">회원가입</Link>
    </span>
  );
}
