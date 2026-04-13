"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

type Props = {
  projectId: string;
};

export function ManualApplicantForm({ projectId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.replace(/\D/g, "");

    if (!trimmedName) {
      setMessage({ type: "error", text: "이름을 입력해주세요." });
      return;
    }
    if (trimmedPhone.length < 10) {
      setMessage({ type: "error", text: "올바른 연락처를 입력해주세요." });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("project_applications")
      .insert({
        project_id: projectId,
        user_id: null,
        guest_name: trimmedName,
        guest_phone: trimmedPhone,
        status: "pending",
      });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setMessage({ type: "error", text: "이미 같은 연락처로 등록된 지원자가 있습니다." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
      return;
    }

    setMessage({ type: "success", text: `${trimmedName}님을 추가했습니다.` });
    setName("");
    setPhone("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full gap-1.5 rounded-lg"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="size-4" />
        수기 추가
      </Button>
    );
  }

  return (
    <Card className="border border-dashed border-primary/30 shadow-sm">
      <CardContent className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserPlus className="size-4 text-primary" />
          동아리원 수기 추가
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          계정이 없는 동아리원을 이름과 연락처로 추가합니다.
          추후 해당 회원이 가입하면 자동으로 연결됩니다.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">이름 *</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="rounded-lg"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guest-phone">연락처 *</Label>
            <Input
              id="guest-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              className="rounded-lg"
              required
            />
          </div>
          {message && (
            <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting} className="flex-1 rounded-lg">
              {submitting ? "추가 중…" : "추가"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
              onClick={() => {
                setOpen(false);
                setMessage(null);
              }}
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
