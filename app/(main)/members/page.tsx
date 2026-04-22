import { createServerSupabaseClient } from "@/lib/supabase-server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OsAvatar } from "@/components/ui/OsAvatar";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = createServerSupabaseClient();

  let members: Array<{
    id: string; name: string; stage_name: string | null;
    role: string; position: string | null; contract_type: string;
    joined_month: string | null; is_active: boolean;
  }> = [];

  try {
    const { data } = await supabase
      .from("crew_members")
      .select("id, name, stage_name, role, position, contract_type, joined_month, is_active")
      .eq("is_active", true)
      .order("joined_at");
    members = (data ?? []) as typeof members;
  } catch {
    // empty
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>멤버</h1>
          <div className="sub">원샷크루 {members.length}명</div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Users className="ico" strokeWidth={1.5} />
            <div>등록된 멤버가 없어요</div>
          </div>
        </div>
      ) : (
        <div className="os-grid grid-3">
          {members.map(m => (
            <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="row gap-12">
                <OsAvatar name={m.name} size="lg" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                  {m.stage_name && (
                    <div className="mono text-xs muted">{m.stage_name}</div>
                  )}
                </div>
              </div>
              <div className="row gap-6 wrap">
                <StatusBadge
                  status={
                    m.role === "admin" || m.role === "owner"
                      ? "operator"
                      : m.contract_type === "contract"
                        ? "contract_member"
                        : m.contract_type === "guest"
                          ? "external_guest"
                          : "regular_member"
                  }
                />
                {m.position && (
                  <span className="badge">{m.position}</span>
                )}
              </div>
              {m.joined_month && (
                <div className="mono text-xs muted">{m.joined_month} 합류</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
