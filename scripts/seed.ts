/**
 * scripts/seed.ts
 * 개발용 시드 데이터 삽입 스크립트
 *
 * 실행 방법:
 *   npm run seed
 *   또는: npx tsx scripts/seed.ts
 *
 * 환경 변수 필수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (service role 필요 — RLS 우회)
 *
 * 주의: 개발 환경에서만 사용. 프로덕션 실행 금지.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "오류: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정하세요."
  );
  process.exit(1);
}

// localhost가 아닌 경우 프로덕션 경고
if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
  const env = process.env.NODE_ENV;
  if (env === "production") {
    console.error("오류: 프로덕션 환경에서 시드 스크립트를 실행할 수 없습니다.");
    process.exit(1);
  }
  console.warn(
    "경고: 원격 Supabase에 시드 데이터를 삽입합니다. 계속하려면 SEED_REMOTE=true를 설정하세요."
  );
  if (process.env.SEED_REMOTE !== "true") {
    console.error("중단됨. SEED_REMOTE=true 설정 후 재실행하세요.");
    process.exit(1);
  }
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function runSeedSQL(): Promise<void> {
  const sqlPath = join(process.cwd(), "supabase", "migrations", "004_seed.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("시드 SQL 실행 중...");
  const { error } = await supabase.rpc("exec_sql", { sql_text: sql }).single();
  if (error) {
    // exec_sql RPC가 없으면 직접 삽입으로 fallback
    console.warn("exec_sql RPC 없음 — 직접 삽입 방식으로 전환합니다.");
    await insertSeedData();
  } else {
    console.log("시드 SQL 완료.");
  }
}

async function insertSeedData(): Promise<void> {
  console.log("1. Users 삽입...");
  const { error: usersError } = await supabase.from("users").upsert([
    { id: "d0000000-0001-0000-0000-000000000001", email: "doyoon@oneshot.dev", name: "김도윤", phone: "010-1001-0001", role: "owner" },
    { id: "d0000000-0002-0000-0000-000000000002", email: "seo@oneshot.dev", name: "이서연", phone: "010-1001-0002", role: "admin" },
    { id: "d0000000-0003-0000-0000-000000000003", email: "jiwoo@oneshot.dev", name: "박지우", phone: "010-1001-0003", role: "member" },
    { id: "d0000000-0004-0000-0000-000000000004", email: "haneul@oneshot.dev", name: "최하늘", phone: "010-1001-0004", role: "member" },
    { id: "d0000000-0005-0000-0000-000000000005", email: "yujin@oneshot.dev", name: "정유진", phone: "010-1001-0005", role: "member" },
    { id: "d0000000-0006-0000-0000-000000000006", email: "sohee@oneshot.dev", name: "한소희", phone: "010-1001-0006", role: "member" },
    { id: "d0000000-0007-0000-0000-000000000007", email: "minjae@oneshot.dev", name: "강민재", phone: "010-1001-0007", role: "member" },
    { id: "d0000000-0008-0000-0000-000000000008", email: "yerin@oneshot.dev", name: "조예린", phone: "010-1001-0008", role: "member" },
    { id: "d0000000-0009-0000-0000-000000000009", email: "siwoo@oneshot.dev", name: "윤시우", phone: "010-1001-0009", role: "member" },
  ], { onConflict: "id" });
  if (usersError) console.error("Users 오류:", usersError.message);
  else console.log("  Users 완료 (9명)");

  console.log("2. Crew Members 삽입...");
  const { error: cmError } = await supabase.from("crew_members").upsert([
    { id: "c0000000-0001-0000-0000-000000000001", user_id: "d0000000-0001-0000-0000-000000000001", name: "김도윤", stage_name: "DOYOON", email: "doyoon@oneshot.dev", phone: "010-1001-0001", role: "owner", position: "리더", contract_type: "contract", is_active: true, joined_month: "2022-01", joined_at: "2022-01-01T00:00:00Z" },
    { id: "c0000000-0002-0000-0000-000000000002", user_id: "d0000000-0002-0000-0000-000000000002", name: "이서연", stage_name: "SEO", email: "seo@oneshot.dev", phone: "010-1001-0002", role: "admin", position: "안무", contract_type: "contract", is_active: true, joined_month: "2022-03", joined_at: "2022-03-01T00:00:00Z" },
    { id: "c0000000-0003-0000-0000-000000000003", user_id: "d0000000-0003-0000-0000-000000000003", name: "박지우", stage_name: "JIWOO", email: "jiwoo@oneshot.dev", phone: "010-1001-0003", role: "member", position: "퍼포머", contract_type: "contract", is_active: true, joined_month: "2023-05", joined_at: "2023-05-01T00:00:00Z" },
    { id: "c0000000-0004-0000-0000-000000000004", user_id: "d0000000-0004-0000-0000-000000000004", name: "최하늘", stage_name: "HANEUL", email: "haneul@oneshot.dev", phone: "010-1001-0004", role: "member", position: "퍼포머", contract_type: "contract", is_active: true, joined_month: "2023-05", joined_at: "2023-05-01T00:00:00Z" },
    { id: "c0000000-0005-0000-0000-000000000005", user_id: "d0000000-0005-0000-0000-000000000005", name: "정유진", stage_name: "YU-JIN", email: "yujin@oneshot.dev", phone: "010-1001-0005", role: "member", position: "퍼포머", contract_type: "contract", is_active: true, joined_month: "2024-02", joined_at: "2024-02-01T00:00:00Z" },
    { id: "c0000000-0006-0000-0000-000000000006", user_id: "d0000000-0006-0000-0000-000000000006", name: "한소희", stage_name: "SOHEE", email: "sohee@oneshot.dev", phone: "010-1001-0006", role: "member", position: "퍼포머", contract_type: "non_contract", is_active: true, joined_month: "2024-08", joined_at: "2024-08-01T00:00:00Z" },
    { id: "c0000000-0007-0000-0000-000000000007", user_id: "d0000000-0007-0000-0000-000000000007", name: "강민재", stage_name: "MINJAE", email: "minjae@oneshot.dev", phone: "010-1001-0007", role: "member", position: "퍼포머", contract_type: "non_contract", is_active: true, joined_month: "2024-08", joined_at: "2024-08-01T00:00:00Z" },
    { id: "c0000000-0008-0000-0000-000000000008", user_id: "d0000000-0008-0000-0000-000000000008", name: "조예린", stage_name: "YERIN", email: "yerin@oneshot.dev", phone: "010-1001-0008", role: "member", position: "게스트", contract_type: "guest", is_active: true, joined_month: "2025-11", joined_at: "2025-11-01T00:00:00Z" },
    { id: "c0000000-0009-0000-0000-000000000009", user_id: "d0000000-0009-0000-0000-000000000009", name: "윤시우", stage_name: "SIWOO", email: "siwoo@oneshot.dev", phone: "010-1001-0009", role: "member", position: "퍼포머", contract_type: "contract", is_active: false, joined_month: "2023-01", joined_at: "2023-01-01T00:00:00Z" },
  ], { onConflict: "id" });
  if (cmError) console.error("Crew Members 오류:", cmError.message);
  else console.log("  Crew Members 완료 (9명)");

  console.log("3. Projects 삽입...");
  const { error: projError } = await supabase.from("projects").upsert([
    { id: "a1b2c3d4-0001-0000-0000-000000000001", owner_id: "d0000000-0001-0000-0000-000000000001", title: "원샷크루 5월 정기공연 〈FRAME〉", description: "원샷크루가 올해 처음 선보이는 정기공연.", status: "recruiting", type: "paid_gig", venue: "서울 성수 S팩토리 B홀", address: "서울 성동구 성수이로 123", fee: 350000, max_participants: 12, recruitment_end_at: "2026-04-28T23:59:59Z", schedule_undecided: false },
    { id: "a1b2c3d4-0002-0000-0000-000000000002", owner_id: "d0000000-0001-0000-0000-000000000001", title: "브랜드 X 런칭 파티 퍼포먼스", description: "브랜드 런칭 이벤트 오프닝 퍼포먼스.", status: "in_progress", type: "paid_gig", venue: "강남 L호텔 그랜드볼룸", address: "서울 강남구 테헤란로 450", fee: 500000, max_participants: 6, recruitment_end_at: "2026-04-14T23:59:59Z", schedule_undecided: false },
    { id: "a1b2c3d4-0003-0000-0000-000000000003", owner_id: "d0000000-0001-0000-0000-000000000001", title: "4월 팀 정기연습", description: "주간 팀 연습.", status: "in_progress", type: "practice", venue: "연남동 큐브 연습실 2호", address: "서울 마포구 연남로 30", fee: -20000, max_participants: null, recruitment_end_at: "2026-04-22T23:59:59Z", schedule_undecided: false },
    { id: "a1b2c3d4-0004-0000-0000-000000000004", owner_id: "d0000000-0001-0000-0000-000000000001", title: "유니버시티 페스티벌 오픈콜", description: "대학 축제 투어.", status: "recruiting", type: "audition", venue: "경기 일산 킨텍스 제2전시장", address: "경기 고양시 일산서구 킨텍스로 217", fee: 200000, max_participants: 8, recruitment_end_at: "2026-05-10T23:59:59Z", schedule_undecided: false },
  ], { onConflict: "id" });
  if (projError) console.error("Projects 오류:", projError.message);
  else console.log("  Projects 완료 (4개)");

  console.log("시드 데이터 삽입 완료.");
  console.log("schedule_dates, project_applications, payouts, announcements는");
  console.log("004_seed.sql을 Supabase SQL Editor에서 직접 실행하세요.");
}

(async () => {
  try {
    await runSeedSQL();
  } catch (err) {
    console.error("시드 실행 오류:", err);
    await insertSeedData();
  }
})();
