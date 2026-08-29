"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OsAvatar } from "@/components/ui/OsAvatar";
import { fmtKRW, memberKindOf } from "@/lib/utils";
import { LogOut, User, FileText, Calendar, DollarSign, Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PushPrompt } from "@/components/layout/PushPrompt";
import { KOREAN_BANKS } from "@/lib/banks";
import { useMemo } from "react";

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
  profile_image_url: string | null;
  gender: string | null;
  birth_date: string | null;
  youtube_url: string | null;
  instagram_handle: string | null;
  height_cm: number | null;
  top_size: string | null;
  bottom_size: string | null;
  shoe_size: string | null;
  wardrobe_notes: string | null;
  bank_code: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
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
  { key: "schedules", label: "가능 일정", icon: Calendar },
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
                    <StatusBadge status={memberKindOf(member?.role, member?.contract_type)} />
                  </div>
                  {member?.email && (
                    <div className="text-xs muted mt-8">{member.email}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {member && <ProfileEditor member={member} />}

          <PushPrompt />

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
                <div>저장된 가능 일정 프리셋이 없어요</div>
              </div>
            ) : (
              <div style={{ padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>가능 일정 프리셋</div>
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

// ============================================================
// ProfileEditor — 마이페이지 본인 정보 편집 (기본 / 추가 / 정산)
// ============================================================

interface ProfileEditorProps {
  member: Member;
}

type FormState = {
  name: string;
  stage_name: string;
  phone: string;
  gender: string;
  birth_date: string;
  youtube_url: string;
  instagram_handle: string;
  height_cm: string;
  top_size: string;
  bottom_size: string;
  shoe_size: string;
  wardrobe_notes: string;
  bank_code: string;
  bank_account: string;
  bank_holder: string;
};

function buildInitial(m: Member): FormState {
  return {
    name: m.name ?? "",
    stage_name: m.stage_name ?? "",
    phone: m.phone ?? "",
    gender: m.gender ?? "",
    birth_date: m.birth_date ?? "",
    youtube_url: m.youtube_url ?? "",
    instagram_handle: m.instagram_handle ?? "",
    height_cm: m.height_cm != null ? String(m.height_cm) : "",
    top_size: m.top_size ?? "",
    bottom_size: m.bottom_size ?? "",
    shoe_size: m.shoe_size ?? "",
    wardrobe_notes: m.wardrobe_notes ?? "",
    bank_code: m.bank_code ?? "",
    bank_account: m.bank_account ?? "",
    bank_holder: m.bank_holder ?? "",
  };
}

function ProfileEditor({ member }: ProfileEditorProps) {
  const [form, setForm] = useState<FormState>(() => buildInitial(member));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return KOREAN_BANKS;
    return KOREAN_BANKS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.includes(q)
    );
  }, [bankSearch]);

  const selectedBank = KOREAN_BANKS.find((b) => b.code === form.bank_code);

  async function save(scope: "all" | "payout") {
    setFormError(null);

    if (scope === "all") {
      const validationError = !form.name.trim()
        ? "기본 정보의 이름을 입력해주세요."
        : !form.gender
          ? "기본 정보의 성별을 선택해주세요."
          : !form.phone.trim()
            ? "기본 정보의 연락처를 입력해주세요."
            : form.height_cm && (isNaN(Number(form.height_cm)) || Number(form.height_cm) < 50)
              ? "키는 50 이상의 숫자로 입력해주세요."
              : null;
      if (validationError) {
        setFormError(validationError);
        toast.error(validationError);
        document.getElementById("profile-basic-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    const hasAnyPayoutField = Boolean(
      form.bank_code || form.bank_account.trim() || form.bank_holder.trim()
    );
    if (
      hasAnyPayoutField &&
      (!form.bank_code || !form.bank_account.trim() || !form.bank_holder.trim())
    ) {
      const message = "정산 정보를 저장하려면 은행·계좌번호·예금주를 모두 입력해주세요.";
      setFormError(message);
      setShowPayout(true);
      toast.error(message);
      requestAnimationFrame(() => {
        document.getElementById("profile-payout-info")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    const payoutPayload: Record<string, unknown> = {
      bank_code: form.bank_code || null,
      bank_name: selectedBank?.name ?? null,
      bank_account: form.bank_account.trim() || null,
      bank_holder: form.bank_holder.trim() || null,
    };
    const payload: Record<string, unknown> =
      scope === "payout"
        ? payoutPayload
        : {
            name: form.name.trim(),
            stage_name: form.stage_name.trim() || null,
            phone: form.phone.trim(),
            gender: form.gender,
            birth_date: form.birth_date || null,
            youtube_url: form.youtube_url.trim() || null,
            instagram_handle: form.instagram_handle.trim() || null,
            height_cm: form.height_cm ? Number(form.height_cm) : null,
            top_size: form.top_size.trim() || null,
            bottom_size: form.bottom_size.trim() || null,
            shoe_size: form.shoe_size.trim() || null,
            wardrobe_notes: form.wardrobe_notes.trim() || null,
            ...payoutPayload,
          };

    setSaving(true);
    try {
      const res = await fetch(`/api/members/${member.id}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error ?? "저장에 실패했습니다.";
        setFormError(message);
        toast.error(message);
        return;
      }
      toast.success(scope === "payout" ? "정산 정보를 저장했습니다." : "프로필을 저장했습니다.");
    } catch {
      const message = "네트워크 오류로 저장하지 못했습니다. 다시 시도해주세요.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div style={{ padding: 20 }}>
        {/* 기본 정보 */}
        <h3 id="profile-basic-info" style={{ marginBottom: 14, scrollMarginTop: 80 }}>기본 정보</h3>
        <div className="text-xs muted mb-12">
          이름 · 성별 · 연락처 는 필수 항목입니다.
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-12"
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(239, 68, 68, 0.35)",
              background: "rgba(239, 68, 68, 0.07)",
              color: "var(--danger, #b91c1c)",
              fontSize: 13,
            }}
          >
            {formError}
          </div>
        )}

        <div className="os-grid grid-2" style={{ gap: 12 }}>
          <Field label="이름 *" controlId="profile-name">
            <input
              id="profile-name"
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="활동명" controlId="profile-stage-name">
            <input
              id="profile-stage-name"
              className="input"
              value={form.stage_name}
              onChange={(e) => update("stage_name", e.target.value)}
              maxLength={100}
              placeholder="예: 베리"
            />
          </Field>

          <Field label="성별 *" controlId="profile-gender">
            <select
              id="profile-gender"
              className="input"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
            >
              <option value="">선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타/비공개</option>
            </select>
          </Field>
          <Field label="생년월일" controlId="profile-birth-date">
            <input
              id="profile-birth-date"
              type="date"
              className="input"
              value={form.birth_date}
              onChange={(e) => update("birth_date", e.target.value)}
            />
          </Field>

          <Field label="연락처 *" controlId="profile-phone">
            <input
              id="profile-phone"
              className="input"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="010-0000-0000"
              maxLength={30}
            />
          </Field>
          <Field label="유튜브 채널" controlId="profile-youtube">
            <input
              id="profile-youtube"
              className="input"
              value={form.youtube_url}
              onChange={(e) => update("youtube_url", e.target.value)}
              placeholder="https://youtube.com/@..."
              maxLength={500}
            />
          </Field>

          <Field label="인스타그램 ID" controlId="profile-instagram" full>
            <div className="row" style={{ alignItems: "stretch" }}>
              <span
                className="text-xs muted"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  border: "1px solid var(--border)",
                  borderRight: 0,
                  borderRadius: "8px 0 0 8px",
                  background: "var(--soft, #f5f5f5)",
                }}
              >
                instagram.com/
              </span>
              <input
                id="profile-instagram"
                className="input"
                style={{ borderRadius: "0 8px 8px 0" }}
                value={form.instagram_handle}
                onChange={(e) => update("instagram_handle", e.target.value.replace(/^@/, ""))}
                placeholder="아이디만"
                maxLength={60}
              />
            </div>
          </Field>
        </div>

        {/* 추가 정보 (접힘) */}
        <div className="mt-20">
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowExtra((v) => !v)}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span>
              <strong>추가 정보</strong>
              <span className="text-xs muted" style={{ marginLeft: 8 }}>
                섭외/의상 준비용 (선택)
              </span>
            </span>
            {showExtra ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showExtra && (
            <div
              className="os-grid grid-2 mt-12"
              style={{ gap: 12 }}
            >
              <Field label="키 (cm)" controlId="profile-height">
                <input
                  id="profile-height"
                  className="input"
                  type="number"
                  min={50}
                  max={250}
                  value={form.height_cm}
                  onChange={(e) => update("height_cm", e.target.value)}
                  placeholder="예: 170"
                />
              </Field>
              <Field label="신발 사이즈" controlId="profile-shoe-size">
                <input
                  id="profile-shoe-size"
                  className="input"
                  value={form.shoe_size}
                  onChange={(e) => update("shoe_size", e.target.value)}
                  placeholder="예: 250"
                  maxLength={20}
                />
              </Field>
              <Field label="상의 사이즈" controlId="profile-top-size">
                <input
                  id="profile-top-size"
                  className="input"
                  value={form.top_size}
                  onChange={(e) => update("top_size", e.target.value)}
                  placeholder="예: M, 95"
                  maxLength={20}
                />
              </Field>
              <Field label="하의 사이즈" controlId="profile-bottom-size">
                <input
                  id="profile-bottom-size"
                  className="input"
                  value={form.bottom_size}
                  onChange={(e) => update("bottom_size", e.target.value)}
                  placeholder="예: 28, M"
                  maxLength={20}
                />
              </Field>
              <Field label="의상 관련 특이사항" controlId="profile-wardrobe-notes" full>
                <textarea
                  id="profile-wardrobe-notes"
                  className="input"
                  rows={3}
                  value={form.wardrobe_notes}
                  onChange={(e) => update("wardrobe_notes", e.target.value)}
                  placeholder="자유 서술"
                  maxLength={1000}
                />
              </Field>
            </div>
          )}
        </div>

        {/* 정산 정보 (접힘) */}
        <div className="mt-12">
          <button
            id="profile-payout-info"
            type="button"
            className="btn ghost"
            onClick={() => setShowPayout((v) => !v)}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span>
              <strong>정산 정보</strong>
              <span className="text-xs muted" style={{ marginLeft: 8 }}>
                은행/계좌/예금주 (선택)
              </span>
            </span>
            {showPayout ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showPayout && (
            <div className="mt-12">
              <Field label="은행" controlId="profile-bank-search">
                <input
                  id="profile-bank-search"
                  className="input sm"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="은행명 검색"
                />
                <select
                  aria-label="은행 선택"
                  className="input mt-8"
                  value={form.bank_code}
                  onChange={(e) => update("bank_code", e.target.value)}
                  size={Math.min(6, Math.max(3, filteredBanks.length))}
                  style={{ height: "auto" }}
                >
                  <option value="">— 선택 —</option>
                  {filteredBanks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div
                className="os-grid grid-2 mt-12"
                style={{ gap: 12 }}
              >
                <Field label="계좌번호" controlId="profile-bank-account">
                  <input
                    id="profile-bank-account"
                    className="input"
                    value={form.bank_account}
                    onChange={(e) =>
                      update("bank_account", e.target.value.replace(/[^0-9-]/g, ""))
                    }
                    placeholder="숫자/하이픈"
                    maxLength={40}
                  />
                </Field>
                <Field label="예금주명" controlId="profile-bank-holder">
                  <input
                    id="profile-bank-holder"
                    className="input"
                    value={form.bank_holder}
                    onChange={(e) => update("bank_holder", e.target.value)}
                    placeholder="홍길동"
                    maxLength={60}
                  />
                </Field>
              </div>
              <button
                type="button"
                className="btn sm"
                onClick={() => void save("payout")}
                disabled={saving}
                style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                정산 정보만 저장
              </button>
            </div>
          )}
        </div>

        <div className="row mt-20" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => void save("all")}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} strokeWidth={2} />
            )}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  controlId,
  children,
  full,
}: {
  label: string;
  controlId: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label htmlFor={controlId} className="lab text-xs muted" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
