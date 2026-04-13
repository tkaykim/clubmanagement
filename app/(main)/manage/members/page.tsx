"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Mail,
  Phone,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

type MemberRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  joined_at: string;
};

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "대표",
  admin: "운영진",
  member: "멤버",
};

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

const ROLE_ORDER: Record<UserRole, number> = { owner: 0, admin: 1, member: 2 };

export default function ManageMembersPage() {
  const [activeMembers, setActiveMembers] = useState<MemberRow[]>([]);
  const [pendingMembers, setPendingMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"active" | "pending">("active");

  const isAdmin = currentRole === "owner" || currentRole === "admin";

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("crew_members")
      .select("id, user_id, name, email, phone, role, is_active, joined_at")
      .order("joined_at", { ascending: true });

    const rows = (data ?? []) as MemberRow[];

    const active = rows
      .filter((m) => m.is_active)
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
    const pending = rows.filter((m) => !m.is_active);

    setActiveMembers(active);
    setPendingMembers(pending);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: me } = await supabase
          .from("crew_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (me) setCurrentRole(me.role as UserRole);
      }

      fetchMembers();
    }
    init();
  }, [fetchMembers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);

    await supabase.from("crew_members").insert({
      name: formName.trim(),
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
      role: "member",
      is_active: true,
    });

    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setShowForm(false);
    setSubmitting(false);
    fetchMembers();
  }

  async function approveMember(id: string) {
    await supabase
      .from("crew_members")
      .update({ is_active: true })
      .eq("id", id);
    fetchMembers();
  }

  async function deactivateMember(id: string) {
    await supabase
      .from("crew_members")
      .update({ is_active: false })
      .eq("id", id);
    fetchMembers();
  }

  async function toggleAdmin(member: MemberRow) {
    const newRole: UserRole = member.role === "admin" ? "member" : "admin";
    await supabase
      .from("crew_members")
      .update({ role: newRole })
      .eq("id", member.id);
    fetchMembers();
  }

  async function deleteMember(id: string) {
    await supabase.from("crew_members").delete().eq("id", id);
    fetchMembers();
  }

  const displayMembers = tab === "active" ? activeMembers : pendingMembers;

  return (
    <div className="flex flex-col">
      <MobileHeader title="멤버 관리" backHref="/manage" />

      <div className="px-4 py-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("active")}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === "active"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            활성 멤버
            <Badge variant="secondary" className="ml-1.5 text-[10px]">
              {activeMembers.length}
            </Badge>
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === "pending"
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-border text-muted-foreground"
            }`}
          >
            승인 대기
            {pendingMembers.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px]">
                {pendingMembers.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Add button (active tab only) */}
        {tab === "active" && isAdmin && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant={showForm ? "outline" : "default"}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? (
                <>
                  <X className="size-4" />
                  취소
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  멤버 추가
                </>
              )}
            </Button>
          </div>
        )}

        {/* Add form */}
        {showForm && tab === "active" && (
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-4">
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-name">이름 *</Label>
                  <Input
                    id="add-name"
                    placeholder="이름"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-email">이메일</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="email@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-phone">연락처</Label>
                  <Input
                    id="add-phone"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "추가"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Member list */}
        {!loading && (
          <div className="space-y-2">
            {displayMembers.map((m, idx) => (
              <Card key={m.id} className="border-0 shadow-sm">
                <CardContent className="flex items-start gap-3 p-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{m.name}</span>
                      {m.is_active ? (
                        <Badge
                          variant={ROLE_VARIANT[m.role]}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {ROLE_LABEL[m.role]}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600"
                        >
                          대기
                        </Badge>
                      )}
                    </div>

                    {m.email && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="size-3" />
                        {m.email}
                      </div>
                    )}
                    {m.phone && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        {m.phone}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && m.role !== "owner" && (
                    <div className="flex shrink-0 gap-1">
                      {!m.is_active ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 gap-1 text-xs"
                          onClick={() => approveMember(m.id)}
                        >
                          <UserCheck className="size-3.5" />
                          승인
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => toggleAdmin(m)}
                            title={
                              m.role === "admin"
                                ? "멤버로 변경"
                                : "운영진으로 변경"
                            }
                          >
                            {m.role === "admin" ? (
                              <ShieldOff className="size-4 text-muted-foreground" />
                            ) : (
                              <ShieldCheck className="size-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => deactivateMember(m.id)}
                            title="비활성화"
                          >
                            <UserX className="size-4 text-amber-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => deleteMember(m.id)}
                            title="삭제"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && displayMembers.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {tab === "active"
              ? "활성 멤버가 없습니다"
              : "승인 대기 중인 멤버가 없습니다"}
          </div>
        )}
      </div>
    </div>
  );
}
