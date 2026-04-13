"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Pause, Mail, Phone, Loader2 } from "lucide-react";
import type { Applicant } from "./page";

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "확정",
  rejected: "보류",
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

function formatDateTime(d: string): string {
  const date = new Date(d);
  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function ApplicantList({ applicants: initial }: { applicants: Applicant[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(appId: string, status: string) {
    setUpdatingId(appId);
    await supabase
      .from("project_applications")
      .update({ status })
      .eq("id", appId);
    startTransition(() => router.refresh());
    setUpdatingId(null);
  }

  if (initial.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        아직 지원자가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {initial.map((a, idx) => (
        <Card key={a.id} className="border-0 shadow-sm">
          <CardContent className="flex items-start gap-3 p-3">
            {/* Order number */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {idx + 1}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{a.name}</span>
                <Badge
                  variant={STATUS_VARIANT[a.status] ?? "outline"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {STATUS_LABEL[a.status] ?? a.status}
                </Badge>
              </div>

              {a.email && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  {a.email}
                </div>
              )}
              {a.phone && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  {a.phone}
                </div>
              )}
              <div className="mt-1 text-[11px] text-muted-foreground">
                {formatDateTime(a.created_at)}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 gap-1">
              {updatingId === a.id ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Button
                    size="icon"
                    variant={a.status === "approved" ? "default" : "ghost"}
                    className="size-8"
                    onClick={() => updateStatus(a.id, "approved")}
                    disabled={isPending}
                    title="확정"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={a.status === "rejected" ? "destructive" : "ghost"}
                    className="size-8"
                    onClick={() => updateStatus(a.id, "rejected")}
                    disabled={isPending}
                    title="보류"
                  >
                    <Pause className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
