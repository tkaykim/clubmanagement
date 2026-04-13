"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Pause, User, Mail, Phone, UserPlus } from "lucide-react";

type Applicant = {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  user_name: string;
  user_email: string;
  guest_name: string | null;
  guest_phone: string | null;
};

type Props = {
  applicants: Applicant[];
  projectId: string;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "대기", variant: "outline" },
  approved: { label: "확정", variant: "default" },
  rejected: { label: "보류", variant: "secondary" },
};

function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export function ApplicantStatusToggle({ applicants: initial, projectId }: Props) {
  const router = useRouter();
  const [applicants, setApplicants] = useState(initial);
  const [updating, setUpdating] = useState<string | null>(null);

  async function changeStatus(applicationId: string, newStatus: "approved" | "rejected") {
    setUpdating(applicationId);
    const { error } = await supabase
      .from("project_applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (!error) {
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a))
      );
    }
    setUpdating(null);
    router.refresh();
  }

  if (applicants.length === 0) {
    return (
      <Card className="border-0 border-dashed bg-muted/30">
        <CardContent className="py-10 text-center">
          <User className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">아직 지원자가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const confirmed = applicants.filter((a) => a.status === "approved").length;
  const pending = applicants.filter((a) => a.status === "pending").length;
  const hold = applicants.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">전체 {applicants.length}명</Badge>
        {confirmed > 0 && <Badge className="text-xs">확정 {confirmed}명</Badge>}
        {pending > 0 && <Badge variant="secondary" className="text-xs">대기 {pending}명</Badge>}
        {hold > 0 && <Badge variant="outline" className="text-xs">보류 {hold}명</Badge>}
      </div>

      <div className="space-y-2">
        {applicants.map((app) => {
          const config = statusConfig[app.status] ?? statusConfig.pending;
          const isUpdating = updating === app.id;
          const isGuest = !app.user_id;
          const displayName = isGuest ? app.guest_name ?? "이름 없음" : app.user_name;

          return (
            <Card key={app.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${isGuest ? "bg-primary/10" : "bg-muted"}`}>
                        {isGuest
                          ? <UserPlus className="size-4 text-primary" />
                          : <User className="size-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground truncate">{displayName}</p>
                          {isGuest && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">수기</Badge>
                          )}
                        </div>
                        {isGuest ? (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Phone className="size-3" />
                            {app.guest_phone ? formatPhoneDisplay(app.guest_phone) : "-"}
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="size-3" />
                            {app.user_email}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isGuest ? "추가일" : "지원일"}: {new Date(app.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 rounded-lg"
                    variant={app.status === "approved" ? "default" : "outline"}
                    disabled={isUpdating || app.status === "approved"}
                    onClick={() => changeStatus(app.id, "approved")}
                  >
                    <Check className="size-4" />
                    확정
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 rounded-lg"
                    variant={app.status === "rejected" ? "secondary" : "outline"}
                    disabled={isUpdating || app.status === "rejected"}
                    onClick={() => changeStatus(app.id, "rejected")}
                  >
                    <Pause className="size-4" />
                    보류
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
