"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Crown,
  Shield,
  User,
  Users,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import type { CrewMemberRole } from "@/lib/types";

type CrewMemberRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: CrewMemberRole;
  is_active: boolean;
  joined_at: string;
};

const roleLabel: Record<CrewMemberRole, string> = {
  owner: "대표",
  admin: "운영진",
  member: "멤버",
};

const roleIcon: Record<CrewMemberRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleBadgeVariant: Record<CrewMemberRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

export default function ManageMembersPage() {
  const [members, setMembers] = useState<CrewMemberRow[]>([]);
  const [myRole, setMyRole] = useState<CrewMemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const canManage = myRole === "owner" || myRole === "admin";

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("crew_members")
      .select("id, user_id, name, email, phone, role, is_active, joined_at")
      .eq("is_active", true)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });
    setMembers((data ?? []) as CrewMemberRow[]);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && data) {
      const me = (data as CrewMemberRow[]).find((m) => m.user_id === user.id);
      setMyRole(me?.role ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleAdd() {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    setAdding(true);

    const { error } = await supabase.from("crew_members").insert({
      name: trimmedName,
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      role: "member",
    });

    if (error) {
      alert("추가 실패: " + error.message);
    } else {
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setShowAddForm(false);
      await loadMembers();
    }
    setAdding(false);
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`${name} 멤버를 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from("crew_members").delete().eq("id", id);
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      await loadMembers();
    }
  }

  async function handleToggleAdmin(member: CrewMemberRow) {
    if (member.role === "owner") return;
    const newRole: CrewMemberRole = member.role === "admin" ? "member" : "admin";
    const action = newRole === "admin" ? "운영진으로 지정" : "운영진 해제";
    if (!confirm(`${member.name}을(를) ${action}하시겠습니까?`)) return;

    const { error } = await supabase
      .from("crew_members")
      .update({ role: newRole })
      .eq("id", member.id);
    if (error) {
      alert("변경 실패: " + error.message);
    } else {
      await loadMembers();
    }
  }

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    return (order[a.role] ?? 9) - (order[b.role] ?? 9);
  });

  if (loading) {
    return (
      <div>
        <MobileHeader title="멤버 관리" />
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          불러오는 중…
        </div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="멤버 관리" />
      <div className="px-4 py-4">
        <div className="mb-1">
          <Link
            href="/manage"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-3" />
            관리 홈
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              총 {members.length}명
            </span>
          </div>
          {canManage && (
            <Button
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <UserPlus className="size-4" />
              멤버 추가
            </Button>
          )}
        </div>

        {showAddForm && canManage && (
          <Card className="mb-4 border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">새 멤버 추가</h3>
              <Input
                placeholder="이름 *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="이메일 (선택)"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                placeholder="전화번호 (선택)"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-lg"
                  disabled={!newName.trim() || adding}
                  onClick={handleAdd}
                >
                  {adding ? "추가 중…" : "추가"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setShowAddForm(false)}
                >
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {sortedMembers.map((m) => {
            const RoleIcon = roleIcon[m.role];
            return (
              <Card
                key={m.id}
                className="border-0 shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <RoleIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {m.name}
                        </span>
                        <Badge variant={roleBadgeVariant[m.role]} className="text-xs">
                          {roleLabel[m.role]}
                        </Badge>
                      </div>
                      {m.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.email}
                        </p>
                      )}
                      {m.phone && (
                        <p className="text-xs text-muted-foreground">
                          {m.phone}
                        </p>
                      )}
                    </div>

                    {canManage && m.role !== "owner" && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handleToggleAdmin(m)}
                          title={
                            m.role === "admin"
                              ? "운영진 해제"
                              : "운영진 지정"
                          }
                        >
                          {m.role === "admin" ? (
                            <ShieldOff className="size-4 text-orange-500" />
                          ) : (
                            <ShieldCheck className="size-4 text-blue-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handleRemove(m.id, m.name)}
                          title="삭제"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {members.length === 0 && (
            <Card className="border-0 bg-muted/30">
              <CardContent className="py-10 text-center">
                <Users className="mx-auto size-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  등록된 멤버가 없습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
