"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const phoneDigits = phone.replace(/\D/g, "");

    const { data: signUpData, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || undefined, phone: phoneDigits || undefined } },
    });
    if (err) {
      setError(err.message ?? "회원가입에 실패했습니다.");
      setLoading(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (userId && phoneDigits) {
      await supabase
        .from("users")
        .update({ phone: phoneDigits })
        .eq("id", userId);

      if (name.trim()) {
        await supabase.rpc("link_guest_applications", {
          p_user_id: userId,
          p_name: name.trim(),
          p_phone: phoneDigits,
        });
      }
    }

    setLoading(false);
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <h1 className="text-xl font-bold text-foreground">회원가입</h1>
        <p className="text-sm text-muted-foreground">우리들의 동아리, 우동에 오신 걸 환영해요</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름 (닉네임)</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              수기 등록된 동아리 활동 이력이 있다면 자동으로 연결됩니다.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground">6자 이상 입력해 주세요.</p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? "가입 중…" : "가입하고 관심사 선택하기"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
