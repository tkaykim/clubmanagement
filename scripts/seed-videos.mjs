import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/그리고/Desktop/기타/udong/.claude/worktrees/intelligent-rhodes-422fa7";

const videos = JSON.parse(fs.readFileSync(path.join(ROOT, "oneshot_videos.json"), "utf8"));

/**
 * Classification rules (in order):
 *  - is_featured=true:
 *      NHbITbgUkLI (BTS Body To Body KPOP IN PUBLIC 265k — original choreo)
 *      BHHGtzjJiwc (Milano Cortina 2026 Olympic Demon Hunters medley)
 *  - performance: titles with ONESHOT/OWN ORIGINAL markers
 *      * "Original Choreography" (자체 안무)
 *      * "ONESHOT MEGA CREW" (메가크루 자체 퍼포먼스)
 *      * "Choreography by ... (ONESHOT crew)" (크루 멤버 안무)
 *      * "Dance Medley by ONESHOT crew"
 *      * "Dance Practice" of own choreography
 *      * "레드크루 10주년 쇼케이스 게스트" (showcase)
 *      * "KPOP IN SCHOOL" 찬조공연
 *      * "28인 댄서가 함께 만드는 올장르 퍼포먼스" (original)
 *      * "BLACKPINK ... DANCE MEDLEY Practice ver." (own medley)
 *      * "Rumi & Jinu 'Free' Dance Performance" (own choreo)
 *  - cover: titles with "Dance Cover" / "커버댄스" / "Perfomance Film" (단순 커버)
 *  - other_video: short shorts-style titles + "BEHIND VLOG" + 배틀 컨텐츠
 */

const FEATURED_IDS = new Set(["NHbITbgUkLI", "BHHGtzjJiwc"]);

const PERFORMANCE_IDS = new Set([
  "NHbITbgUkLI",        // BTS Body To Body KPOP IN PUBLIC Original Choreography (Featured)
  "dqzpOAD4JaE",        // BTS Body To Body Dance Practice MEGA CREW Original
  "BHHGtzjJiwc",        // Milano Cortina 2026 Demon Hunters (Featured)
  "PMOxczNVMBw",        // Demon Hunters KOREA Medley
  "448u81AvOI4",        // JENNIE Mantra Choreography by GaHyun (member original)
  "MvbgC2MUrsg",        // Rumi & Jinu Free Dance Performance
  "gVnq2psRcZ8",        // BLACKPINK Medley Choreography by Gahyun Kim
  "mJ_UxHwOsZo",        // 28인 올장르 퍼포먼스 TADC (original)
  "mvaJdAZ2CuY",        // BLACKPINK Medley Practice ver.
  "FlAaDMX9HAg",        // 레드크루 10주년 쇼케이스 게스트
  "_D4aAqR-ou4",        // KPOP IN SCHOOL 서울매그넷고 찬조공연
]);

const OTHER_IDS = new Set([
  "t4NMqjnIkP4",        // 배경부터 의상까지 완벽 (short)
  "_bCA8JYXgOc",        // #Swim 제일 잘 살리는 (short)
  "uYhG-f0UgUY",        // 둘다 쾌감 미침 (short)
  "dMX0OOcXaGc",        // 신촌에서 방탄 아리랑 (short)
  "bdQy8dCm1cc",        // 25인 댄서들이 만들어옴 (short)
  "yJCI20NtyFs",        // 댄서들이 만든 BTS 신곡 안무 (short)
  "RVgXwu0VnbE",        // BTS Body To Body 한국댄서들의 안무 (short)
  "6Pqv-ARm5L8",        // 뭐든지 빠른 한국인 (short)
  "xcn3GRUvbHM",        // 어느팀이 가장 잘 하나요? (short)
  "QUi8BSWT6QA",        // 방탄노래에 한국무용+군무 (short)
  "Qn2XqUlf5XY",        // 안무없으면 만들어서 추는 (short)
  "lRvaFWhQY30",        // OneShot Battle BTS vs I-DLE
  "x_IPwyE9hrE",        // BEHIND VLOG WICKED
  "1XSDg37FnSA",        // BEHIND VLOG BURNING UP
]);

function classify(v) {
  if (OTHER_IDS.has(v.id)) return "other_video";
  if (PERFORMANCE_IDS.has(v.id)) return "performance";
  return "cover"; // default: dance covers
}

function sqlEscape(s) {
  if (s === null || s === undefined) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function parseIsoDate(s) {
  // RSS format or Korean relative; only use when ISO
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Sort by views desc so sort_order respects popularity per kind
videos.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

const perKindCounter = new Map();
const rows = videos.map((v) => {
  const kind = classify(v);
  const idx = perKindCounter.get(kind) ?? 0;
  perKindCounter.set(kind, idx + 1);
  return {
    kind,
    title: v.title,
    youtube_url: `https://www.youtube.com/watch?v=${v.id}`,
    thumbnail_url: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    description: v.views ? `조회수 ${v.views.toLocaleString("ko-KR")}회` : null,
    sort_order: idx,
    is_featured: FEATURED_IDS.has(v.id),
    event_date: parseIsoDate(v.published),
    views: v.views,
    youtube_id: v.id,
  };
});

// Print summary
const counts = {};
for (const r of rows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
console.log("Counts:", counts);
console.log("Featured:", rows.filter((r) => r.is_featured).map((r) => `${r.kind}:${r.title}`));

// Generate SQL
const valuesSql = rows
  .map((r) =>
    `(gen_random_uuid(), ${sqlEscape(r.kind)}, ${sqlEscape(r.title)}, ` +
    `${sqlEscape(r.description)}, NULL, ${sqlEscape(r.youtube_url)}, ${sqlEscape(r.thumbnail_url)}, ` +
    `${r.sort_order}, ${r.is_featured}, ${r.event_date ? sqlEscape(r.event_date) : "NULL"}, ` +
    `NULL, NULL, now(), now())`
  )
  .join(",\n");

const sql = `
-- Seed ONESHOT crew portfolio videos (from YouTube public data, sorted by views)
INSERT INTO portfolio_media
  (id, kind, title, description, image_url, youtube_url, thumbnail_url, sort_order, is_featured, event_date, venue, created_by, created_at, updated_at)
VALUES
${valuesSql};
`.trim();

fs.writeFileSync(path.join(ROOT, "oneshot_seed.sql"), sql);
console.log(`\nWrote ${rows.length} rows → oneshot_seed.sql`);
