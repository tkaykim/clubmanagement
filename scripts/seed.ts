/**
 * 우동 - 초기 데이터 시드
 * 실행: npm run seed 또는 npx tsx scripts/seed.ts
 * 필요 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
try {
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv optional
}
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const SEED_EMAIL = "seed@udong.club";
const SEED_PASSWORD = "SeedPass1!";

async function main() {
  // 1) 시드용 Auth 유저 생성 (없으면)
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "김동아" },
  });

  let userId: string;
  if (authErr) {
    if (authErr.message?.includes("already been registered")) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === SEED_EMAIL);
      if (!existing) {
        console.error("이메일 중복인데 유저 조회 실패:", authErr);
        process.exit(1);
      }
      userId = existing.id;
      console.log("기존 시드 유저 사용:", userId);
    } else {
      console.error("Auth 유저 생성 실패:", authErr);
      process.exit(1);
    }
  } else {
    userId = authUser.user!.id;
    console.log("시드 유저 생성:", userId);
  }

  await supabase.from("users").upsert(
    { id: userId, email: SEED_EMAIL, name: "김동아", updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  // 2) 대분류 ID 조회
  const { data: majors } = await supabase.from("category_major").select("id, name").in("name", ["댄스", "음악/밴드", "스포츠/운동"]);
  const majorByName = Object.fromEntries((majors ?? []).map((m) => [m.name, m.id]));
  const danceMajorId = majorByName["댄스"];
  const bandMajorId = majorByName["음악/밴드"];
  const sportsMajorId = majorByName["스포츠/운동"];

  // 3) 동아리 3개 (실제 데이터 형식, category_major_id 사용)
  const clubRows = [
    {
      name_ko: "힙합 크루 동아리",
      name_en: "Hip-hop Crew",
      description: "힙합과 스트릿 댄스에 관심 있는 분들 모집합니다. 정기 공연과 영상 촬영 프로젝트를 진행해요.",
      category_major_id: danceMajorId,
      max_members: 30,
      is_recruiting: true,
      owner_id: userId,
      recruitment_deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name_ko: "캠퍼스 밴드",
      name_en: "Campus Band",
      description: "밴드 연주와 정기 공연을 함께할 멤버를 찾습니다. 재즈, 록, 인디 등 다양한 장르 환영.",
      category_major_id: bandMajorId,
      max_members: 20,
      is_recruiting: true,
      owner_id: userId,
      recruitment_deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name_ko: "러닝 크루",
      name_en: "Running Crew",
      description: "주말 마라톤·러닝 모임입니다. 초보자도 환영합니다.",
      category_major_id: sportsMajorId,
      max_members: 50,
      is_recruiting: false,
      owner_id: userId,
    },
  ];

  for (const row of clubRows) {
    const { error: insErr } = await supabase.from("clubs").insert(row);
    if (insErr) {
      if (insErr.code === "23505" || insErr.message?.includes("duplicate")) {
        // 이미 존재하면 스킵
        continue;
      }
      console.warn("club insert skip:", insErr.message);
    }
  }

  const { data: clubs } = await supabase.from("clubs").select("id, name").eq("owner_id", userId);
  const club1 = clubs?.find((c) => c.name === "힙합 크루 동아리")?.id;
  const club2 = clubs?.find((c) => c.name === "캠퍼스 밴드")?.id;
  const club3 = clubs?.find((c) => c.name === "러닝 크루")?.id;

  // 4) 동아리 회원
  if (club1) {
    await supabase.from("members").upsert(
      [
        { club_id: club1, user_id: userId, role: "owner", status: "approved" },
        { club_id: club1, user_id: userId, role: "member", status: "approved" },
      ],
      { onConflict: "club_id,user_id", ignoreDuplicates: true }
    );
  }
  if (club2) {
    await supabase.from("members").upsert(
      [{ club_id: club2, user_id: userId, role: "owner", status: "approved" }],
      { onConflict: "club_id,user_id", ignoreDuplicates: true }
    );
  }

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // 5) 프로젝트
  const projectDefs = [
    {
      club_id: club1,
      name: "3월 정기 공연",
      description: "힙합 크루 3월 정기 공연입니다. 관람 신청 받습니다.",
      status: "scheduled",
      starts_at: nextMonth.toISOString().slice(0, 10),
      ends_at: nextMonth.toISOString().slice(0, 10),
      created_by: userId,
      visibility: "public",
      project_type: "free",
      poster_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
      recruitment_deadline_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      club_id: club1,
      name: "댄스 영상 촬영",
      description: "대관·촬영·편집 일정이 있는 프로젝트입니다.",
      status: "in_progress",
      starts_at: now.toISOString().slice(0, 10),
      ends_at: nextMonth.toISOString().slice(0, 10),
      created_by: userId,
      visibility: "club_only",
      project_type: "free",
      recruitment_deadline_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      club_id: club2,
      name: "봄 정기 공연",
      description: "캠퍼스 밴드 봄 정기 공연. 많은 관람 부탁드려요.",
      status: "scheduled",
      starts_at: nextMonth.toISOString().slice(0, 10),
      ends_at: nextMonth.toISOString().slice(0, 10),
      created_by: userId,
      visibility: "public",
      project_type: "paid",
      poster_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
      recruitment_deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      club_id: club1,
      name: "2월 워크숍",
      description: "지난 워크숍 프로젝트 (종료).",
      status: "completed",
      starts_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      ends_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      created_by: userId,
      visibility: "club_only",
      project_type: "free",
    },
  ].filter((p) => p.club_id);

  for (const row of projectDefs) {
    const { data: exists } = await supabase.from("projects").select("id").eq("club_id", row.club_id).eq("name", row.name).maybeSingle();
    if (!exists) await supabase.from("projects").insert(row);
  }

  const { data: projectList } = await supabase.from("projects").select("id, name").in("club_id", [club1, club2].filter(Boolean) as string[]);
  const projects = projectList ?? [];
  const projectIds = projects.map((p) => p.id);

  for (const pid of projectIds) {
    await supabase.from("project_members").upsert(
      [{ project_id: pid, user_id: userId, role: "lead" }],
      { onConflict: "project_id,user_id", ignoreDuplicates: true }
    );
  }

  const inProgressProject = projects.find((p) => p.name === "댄스 영상 촬영");
  if (inProgressProject) {
    const due1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const due2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await supabase.from("tasks").upsert(
      [
        { project_id: inProgressProject.id, title: "대관 일정 잡기", assignee_id: userId, due_date: due1.toISOString().slice(0, 10), status: "in_progress" },
        { project_id: inProgressProject.id, title: "촬영 장소 확정", assignee_id: userId, due_date: due2.toISOString().slice(0, 10), status: "todo" },
      ],
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  if (club1) {
    const start1 = new Date(now);
    start1.setDate(start1.getDate() + 3);
    start1.setHours(19, 0, 0, 0);
    const end1 = new Date(start1);
    end1.setHours(21, 0, 0, 0);
    await supabase.from("schedules").upsert(
      [
        {
          club_id: club1,
          title: "정기 연습",
          description: "주간 정기 연습",
          location: "학생회관 301",
          starts_at: start1.toISOString(),
          ends_at: end1.toISOString(),
          created_by: userId,
        },
      ],
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  console.log("시드 완료. 계정:", SEED_EMAIL);
}

main();
