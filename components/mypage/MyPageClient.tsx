"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OsAvatar } from "@/components/ui/OsAvatar";
import { fmtKRW } from "@/lib/utils";
import { LogOut, User, FileText, Calendar, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  stage_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  position: string | null;
  contract_type: string;
  joined_month: string | null;
}

interface Application {
  id: string;
  project_id: string;
  status: string;
  created_at: string;
  projects: { title: string; type: string };
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  scheduled_at: string | null;
  projects: { title: string };
}

interface Preset {
  id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
}

interface MyPageClientProps {
  member: Member | null;
  applications: Application[];
  payouts: Payout[];
  presets: Preset[];
}

const TABS = [
  { key: "profile", label: "프로필", icon: User },
  { key: "applications", label: "내 지원", icon: FileText },
  { key: "schedules", label: "가용성", icon: Calendar },
  { key: "payouts", label: "정산", icon: DollarSign },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function MyPageClient({ member, applications, payouts, presets }: MyPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const totalPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payouts.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      {/* 탭 */}
      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={cn("tab", activeTab === t.key && "on")}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={14} strokeWidth={2} />
            {t.label}
            {t.key === "applications" && applications.length > 0 && (
              <span className="count">{applications.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* 프로필 탭 */}
      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ padding: 24 }}>
              <div className="row gap-16 mb-20">
                <OsAvatar name={member?.name ?? "—"} size="lg" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{member?.name ?? "이름 없음"}</div>
                  {member?.stage_name && (
                    <div className="mono text-xs muted">{member.stage_name}</div>
                  )}
                  <div className="row gap-6 mt-8">
                    <StatusBadge status={member?.role ?? "member"} />
                    {member?.contract_type && <StatusBadge status={member.contract_type} />}
                  </div>
                </div>
              </div>
              <dl className="kv">
                {member?.email && (
                  <>
                    <dt>이메일</dt>
                    <dd>{member.email}</dd>
                  </>
                )}
                {member?.phone && (
                  <>
                    <dt>연락처</dt>
                    <dd>{member.phone}</dd>
                  </>
                )}
                {member?.position && (
                  <>
                    <dt>포지션</dt>
                    <dd>{member.position}</dd>
                  </>
                )}
                {member?.joined_month && (
                  <>
                    <dt>합류</dt>
                    <dd className="mono text-xs">{member.joined_month}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <button
            className="btn ghost danger"
            onClick={handleLogout}
            disabled={logoutLoading}
            style={{ alignSelf: "flex-start" }}
          >
            {logoutLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} strokeWidth={2} />}
            로그아웃
          </button>
        </div>
      )}

      {/* 내 지원 탭 */}
      {activeTab === "applications" && (
        <div>
          {applications.length === 0 ? (
            <div className="card">
              <div className="empty">
                <FileText className="ico" strokeWidth={1.5} />
                <div>지원 내역이 없어요</div>
                <Link href="/projects" className="btn sm mt-12">프로젝트 보기</Link>
              </div>
            </div>
          ) : (
            <div className="card flush">
              {applications.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < applications.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <div className="flex-1">
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {a.projects?.title ?? "—"}
                    </div>
                    <div className="mono text-xs muted">
                      {new Date(a.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 가용성 탭 */}
      {activeTab === "schedules" && (
        <div>
          <div className="card">
            {presets.length === 0 ? (
              <div className="empty">
                <Calendar className="ico" strokeWidth={1.5} />
                <div>저장된 가용성 프리셋이 없어요</div>
              </div>
            ) : (
              <div style={{ padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>가용성 프리셋</div>
                {presets.map(p => (
                  <div key={p.id} className="row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                      {p.description && (
                        <div className="text-xs muted">{p.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 정산 탭 */}
      {activeTab === "payouts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="os-grid grid-2">
            <div className="card stat">
              <div className="lab">지급 완료</div>
              <div className="num tabnum" style={{ fontSize: 24 }}>{fmtKRW(totalPaid)}</div>
              <div className="delta">원</div>
            </div>
            <div className="card stat">
              <div className="lab">정산 대기</div>
              <div className="num tabnum" style={{ fontSize: 24 }}>{fmtKRW(totalPending)}</div>
              <div className="delta">원</div>
            </div>
          </div>

          {payouts.length === 0 ? (
            <div className="card">
              <div className="empty">
                <DollarSign className="ico" strokeWidth={1.5} />
                <div>정산 내역이 없어요</div>
              </div>
            </div>
          ) : (
            <div className="card flush">
              {payouts.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < payouts.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <div className="flex-1">
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {p.projects?.title ?? "—"}
                    </div>
                    {p.scheduled_at && (
                      <div className="mono text-xs muted">예정일 {p.scheduled_at}</div>
                    )}
                  </div>
                  <div className="row gap-8">
                    <span className="tabnum" style={{ fontWeight: 700 }}>₩{fmtKRW(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
