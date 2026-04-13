"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Mail, User, Phone } from "lucide-react";
import type { User as AuthUser } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type CrewInfo = {
  role: string;
} | null;

export default function MyPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [crewInfo, setCrewInfo] = useState<CrewInfo>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthUser(user);
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("id, name, email, phone")
          .eq("id", user.id)
          .single();
        setProfile(data as UserProfile | null);

        const { data: crew } = await supabase
          .from("crew_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        setCrewInfo(crew as CrewInfo);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="내 정보" />
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          불러오는 중…
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="내 정보" />
        <div className="px-4 py-8 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center space-y-4">
              <User className="mx-auto size-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                로그인하면 프로젝트에 참여하고 일정을 투표할 수 있습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/login">
                  <Button variant="outline" className="rounded-xl">
                    로그인
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="rounded-xl">회원가입</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.name ||
    (authUser.user_metadata?.name as string) ||
    authUser.email?.split("@")[0] ||
    "회원";

  return (
    <div className="flex flex-col">
      <MobileHeader title="내 정보" />
      <div className="px-4 py-5 space-y-4">
        {/* 프로필 카드 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground">
                  {displayName}
                </h2>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {crewInfo?.role === "owner"
                    ? "대표"
                    : crewInfo?.role === "admin"
                      ? "운영진"
                      : "원샷 멤버"}
                </Badge>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span>{profile?.email || authUser.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 로그아웃 */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full rounded-xl gap-2 text-muted-foreground"
        >
          <LogOut className="size-4" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
