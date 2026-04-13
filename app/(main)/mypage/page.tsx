"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Mail, Phone, Loader2 } from "lucide-react";
import type { UserRole } from "@/lib/types";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

const ROLE_DISPLAY: Record<string, string> = {
  owner: "대표",
  admin: "운영진",
};

function getRoleLabel(role: string | null): string {
  if (!role) return "원샷 멤버";
  return ROLE_DISPLAY[role] ?? "원샷 멤버";
}

function getRoleVariant(role: string | null): "default" | "secondary" | "outline" {
  if (role === "owner") return "default";
  if (role === "admin") return "secondary";
  return "outline";
}

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: userData } = await supabase
        .from("users")
        .select("id, name, email, phone")
        .eq("id", user.id)
        .single();

      const { data: crewData } = await supabase
        .from("crew_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const u = userData as { id: string; name: string; email: string; phone: string | null } | null;

      setProfile({
        name: u?.name ?? user.user_metadata?.name ?? "이름 없음",
        email: u?.email ?? user.email ?? "",
        phone: u?.phone ?? null,
        role: (crewData?.role as string) ?? null,
      });

      setLoading(false);
    }

    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-col">
      <MobileHeader title="내 정보" />

      <div className="px-4 py-5 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !isLoggedIn && (
          <Card className="border-0 bg-muted/30">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <p className="text-sm text-muted-foreground">
                로그인이 필요합니다
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/login">로그인</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/signup">회원가입</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && isLoggedIn && profile && (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="flex items-start gap-4 p-5">
                {/* Avatar initial */}
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {profile.name.charAt(0)}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{profile.name}</span>
                    <Badge
                      variant={getRoleVariant(profile.role)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>

                  {profile.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5" />
                      {profile.email}
                    </div>
                  )}

                  {profile.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="size-3.5" />
                      {profile.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              로그아웃
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
