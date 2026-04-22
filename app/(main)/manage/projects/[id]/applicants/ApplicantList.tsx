"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Check, X, Mail, Phone, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

export type Applicant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
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
  const [, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(appId: string, status: string) {
    setUpdatingId(appId);
    const { error } = await supabase
      .from("project_applications")
      .update({ status })
      .eq("id", appId);
    if (error) {
      toast.error("상태 변경에 실패했습니다");
    } else {
      toast.success("상태가 변경되었습니다");
      startTransition(() => router.refresh());
    }
    setUpdatingId(null);
  }

  if (initial.length === 0) {
    return (
      <div className="card">
        <div className="empty">아직 지원자가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="card flush">
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>이름</th>
            <th>연락처</th>
            <th>상태</th>
            <th>지원일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {initial.map((a, idx) => (
            <tr key={a.id}>
              <td data-label="#" className="mono text-xs muted">{idx + 1}</td>
              <td data-label="이름" style={{ fontWeight: 600 }}>{a.name}</td>
              <td data-label="연락처">
                {a.email && (
                  <div className="row gap-4" style={{ fontSize: 12, color: "var(--mf)" }}>
                    <Mail size={11} strokeWidth={2} />
                    {a.email}
                  </div>
                )}
                {a.phone && (
                  <div className="row gap-4" style={{ fontSize: 12, color: "var(--mf)" }}>
                    <Phone size={11} strokeWidth={2} />
                    {a.phone}
                  </div>
                )}
                {!a.email && !a.phone && <span style={{ color: "var(--mf-2)" }}>—</span>}
              </td>
              <td data-label="상태"><StatusBadge status={a.status} /></td>
              <td data-label="지원일" className="mono text-xs muted">{formatDateTime(a.created_at)}</td>
              <td data-label="액션">
                {updatingId === a.id ? (
                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--mf)" }} />
                ) : (
                  <div className="row gap-6">
                    <button
                      className="btn sm icon-only ghost"
                      style={a.status === "approved" ? { background: "var(--ok)", color: "#fff" } : {}}
                      onClick={() => updateStatus(a.id, "approved")}
                      title="확정"
                    >
                      <Check size={12} strokeWidth={2.5} />
                    </button>
                    <button
                      className="btn sm icon-only ghost danger"
                      style={a.status === "rejected" ? { background: "var(--danger)", color: "#fff" } : {}}
                      onClick={() => updateStatus(a.id, "rejected")}
                      title="거절"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
