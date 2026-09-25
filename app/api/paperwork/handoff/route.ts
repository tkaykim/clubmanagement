import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getProjectAccess, getSession } from "@/lib/auth";
import { getFinanceIdentity } from "@/lib/finance-server";
import { canReadFinanceProject } from "@/lib/finance-access";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

// 그리고엔터 공통 거래 서류(grigoent.co.kr/paperwork)로 담당자를 넘긴다.
// 여기서 원샷크루 권한(운영진·프로젝트 관리자·재무 담당자)을 확인하고, 공유 비밀키로 서명한 10분짜리 토큰을 붙인다.
const PAPERWORK_START_URL = "https://www.grigoent.co.kr/paperwork/start";

function sign(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project") ?? "";
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  const secret = process.env.PAPERWORK_HANDOFF_SECRET;
  if (!secret) return NextResponse.json({ error: "거래 서류 연동 설정이 없습니다." }, { status: 500 });
  if (!/^[0-9a-f-]{36}$/.test(projectId)) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  const [access, finance] = await Promise.all([getProjectAccess(projectId), getFinanceIdentity()]);
  const financeReadable = finance ? canReadFinanceProject(finance, projectId) : false;
  if (!access && !financeReadable) return NextResponse.json({ error: "이 프로젝트의 담당자만 사용할 수 있습니다." }, { status: 403 });

  const supabase = createRouteSupabaseClient();
  const [{ data: project }, { data: member }, fin] = await Promise.all([
    supabase.from("projects").select("id, title").eq("id", projectId).maybeSingle(),
    supabase.from("crew_members").select("name, stage_name").eq("user_id", session.userId).maybeSingle(),
    financeReadable
      ? supabase.from("project_finance").select("client_name").eq("project_id", projectId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  const m = member as { name: string | null; stage_name: string | null } | null;
  const token = sign(
    {
      app: "oneshotcrew",
      uid: session.userId,
      name: `원샷크루 ${m?.name || m?.stage_name || "담당자"}`,
      email: session.email || undefined,
      project: (project as { title: string }).title,
      projectRef: projectId,
      client: (fin.data as { client_name: string | null } | null)?.client_name || undefined,
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    secret,
  );
  return NextResponse.redirect(`${PAPERWORK_START_URL}?h=${encodeURIComponent(token)}`);
}
