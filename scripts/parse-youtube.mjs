import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/그리고/Desktop/기타/udong/.claude/worktrees/intelligent-rhodes-422fa7";

function parsePopular() {
  const html = fs.readFileSync(path.join(ROOT, "oneshot_popular.html"), "utf8");
  const m = html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/);
  if (!m) throw new Error("no ytInitialData");
  const data = JSON.parse(m[1]);
  const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  const videoTab =
    tabs.find((t) => t.tabRenderer?.content?.richGridRenderer) ??
    tabs.find((t) => t.tabRenderer?.title === "동영상" || t.tabRenderer?.title === "Videos");
  const items = videoTab?.tabRenderer?.content?.richGridRenderer?.contents ?? [];
  const out = [];
  for (const it of items) {
    const v = it.richItemRenderer?.content?.videoRenderer;
    if (!v) continue;
    const id = v.videoId;
    const title = v.title?.runs?.[0]?.text ?? v.title?.simpleText ?? "";
    const viewsText = v.viewCountText?.simpleText ?? v.viewCountText?.runs?.map((r) => r.text).join("") ?? "";
    const published = v.publishedTimeText?.simpleText ?? "";
    const thumb = v.thumbnail?.thumbnails?.at(-1)?.url ?? "";
    const lengthText = v.lengthText?.simpleText ?? "";
    // Parse views number
    const viewsMatch = viewsText.match(/[\d,]+/);
    const views = viewsMatch ? Number(viewsMatch[0].replace(/,/g, "")) : 0;
    out.push({ id, title, views, viewsText, published, thumb, lengthText });
  }
  return out;
}

function parseRss() {
  const xml = fs.readFileSync(path.join(ROOT, "oneshot_rss.xml"), "utf8");
  const entries = xml.split("<entry>").slice(1);
  const out = [];
  for (const e of entries) {
    const id = e.match(/<yt:videoId>([^<]+)</)?.[1];
    const title = e.match(/<title>([^<]+)</)?.[1];
    const published = e.match(/<published>([^<]+)</)?.[1];
    const views = Number(e.match(/views="(\d+)"/)?.[1] ?? 0);
    if (id && title) out.push({ id, title, views, published });
  }
  return out;
}

const popular = parsePopular();
const rss = parseRss();

// Merge, dedupe by id, keep max views
const byId = new Map();
for (const v of popular) {
  byId.set(v.id, { ...v, source: "popular" });
}
for (const v of rss) {
  const prev = byId.get(v.id);
  if (!prev) {
    byId.set(v.id, { ...v, source: "rss" });
  } else if (v.views > (prev.views ?? 0)) {
    byId.set(v.id, { ...prev, views: v.views, published: v.published });
  }
}

const merged = Array.from(byId.values()).sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

console.log(`popular: ${popular.length}, rss: ${rss.length}, merged: ${merged.length}`);
console.log("\nTop 25 by views:");
for (const [i, v] of merged.slice(0, 25).entries()) {
  console.log(`${i + 1}. [${v.views.toLocaleString()}] ${v.title}  (${v.id})`);
}

fs.writeFileSync(
  path.join(ROOT, "oneshot_videos.json"),
  JSON.stringify(merged, null, 2)
);
console.log(`\nSaved ${merged.length} → oneshot_videos.json`);
