import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SettlementsClient, type SettlementRow } from "@/components/manage/SettlementsClient";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ month?: string }> };

export default async function SettlementsPage({ searchParams }: Props) {
  const { month: monthRaw } = await searchParams;
  const month =
    monthRaw && /^\d{4}-\d{2}$/.test(monthRaw)
      ? monthRaw
      : monthRaw === "all"
        ? "all"
        : new Date().toISOString().slice(0, 7);

  const supabase = createServerSupabaseClient();

  type Raw = {
    id: string;
    amount: number;
    status: string;
    scheduled_at: string | null;
    paid_at: string | null;
    note: string | null;
    user_id: string | null;
    project_id: string | null;
  };

  let rows: SettlementRow[] = [];

  try {
    // payouts.user_id → crew_members 는 자동 FK 감지가 안 되므로 수동 조인
    const { data: rawPayouts } = await supabase
      .from("payouts")
      .select("id, amount, status, scheduled_at, paid_at, note, user_id, project_id")
      .order("created_at", { ascending: false });

    const all = (rawPayouts ?? []) as Raw[];

    // 월 필터 (scheduled_at 또는 paid_at 둘 중 하나라도 월에 매치)
    const filtered =
      month === "all"
        ? all
        : all.filter((r) => {
            const d = r.paid_at ?? r.scheduled_at;
            return d ? d.startsWith(month) : false;
          });

    const userIds = Array.from(
      new Set(filtered.map((r) => r.user_id).filter((v): v is string => !!v))
    );
    const projectIds = Array.from(
      new Set(filtered.map((r) => r.project_id).filter((v): v is string => !!v))
    );

    const memberMap = new Map<
      string,
      { id: string; user_id: string; name: string; stage_name: string | null }
    >();
    if (userIds.length > 0) {
      const { data: crews } = await supabase
        .from("crew_members")
        .select("id, user_id, name, stage_name")
        .in("user_id", userIds);
      for (const c of (crews ?? []) as Array<{
        id: string;
        user_id: string;
        name: string;
        stage_name: string | null;
      }>) {
        memberMap.set(c.user_id, c);
      }
    }

    const projectMap = new Map<string, { id: string; title: string }>();
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", projectIds);
      for (const p of (projects ?? []) as Array<{ id: string; title: string }>) {
        projectMap.set(p.id, p);
      }
    }

    rows = filtered.map((r) => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      scheduled_at: r.scheduled_at,
      paid_at: r.paid_at,
      note: r.note,
      member: r.user_id
        ? (() => {
            const m = memberMap.get(r.user_id);
            return m
              ? { id: m.id, user_id: m.user_id, name: m.name, stage_name: m.stage_name }
              : { id: "", user_id: r.user_id, name: "—", stage_name: null };
          })()
        : null,
      project: r.project_id ? projectMap.get(r.project_id) ?? null : null,
    }));
  } catch {
    rows = [];
  }

  return <SettlementsClient rows={rows} month={month} />;
}
