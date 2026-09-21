import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createProjectSchema } from "../../lib/validators.ts";

const projectId = "00000000-0000-4000-8000-000000000010";
const actorId = "00000000-0000-4000-8000-000000000001";
class NextResponse extends Response {
  static json(body, init) { return new NextResponse(JSON.stringify(body), init); }
}

async function setup(options = {}) {
  const calls = [];
  let stored;
  const client = {
    from(table) {
      calls.push(`from:${table}`);
      if (table === "schedule_dates") return {
        async insert(rows) { calls.push({ dates: rows }); return { error: null }; },
      };
      assert.equal(table, "projects");
      return {
        insert(row) {
          calls.push({ insert: row });
          // Model the live RLS snapshot failure: INSERT RETURNING cannot see the
          // new row through the STABLE self-lookup SELECT policy.
          return {
            select() { return { single: async () => ({ data: null, error: { code: "42501", message: "new row violates row-level security policy for table projects" } }) }; },
            then(resolve, reject) {
              if (!options.insertError) stored = { ...row, status: "recruiting" };
              return Promise.resolve({ error: options.insertError ?? null }).then(resolve, reject);
            },
          };
        },
        select() { return {
          eq(column, id) {
            assert.equal(column, "id"); assert.equal(id, projectId);
            return { async single() {
              calls.push("read-created");
              assert.ok(stored, "read must happen after INSERT finishes");
              return { data: options.readError ? null : stored, error: options.readError ?? null };
            } };
          },
        }; },
      };
    },
  };
  const mocks = {
    "next/server": { NextResponse },
    "node:crypto": { randomUUID: () => projectId },
    "@/lib/supabase-server": { createRouteSupabaseClient: () => client },
    "@/lib/auth": {
      requireAdmin: async () => options.guard ?? { user_id: actorId, name: "Synthetic operator" },
      isNextResponse: value => value instanceof Response,
    },
    "@/lib/validators": { createProjectSchema },
    "@/lib/activity-log": { logActivity: async () => calls.push("activity") },
    "@/lib/notifications": { notifyVisibility: async () => calls.push("notify") },
  };
  const source = await readFile(process.env.PROJECT_CREATE_ROUTE_SOURCE ?? new URL("../../app/api/projects/route.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported = {};
  vm.runInNewContext(`(function(exports, require) { ${js}\n})`, { console: { error() {} } })(exported, name => {
    assert.ok(Object.hasOwn(mocks, name), `unexpected dependency ${name}`);
    return mocks[name];
  });
  return { calls, post: body => exported.POST(new Request("https://example.test/api/projects", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  })) };
}

for (const visibility of ["public", "admin", "contract", "private"]) {
  test(`project creation survives SELECT RLS snapshot for ${visibility}`, async () => {
    const { calls, post } = await setup();
    const response = await post({ title: "Synthetic project", type: "practice", visibility,
      id: "untrusted-id", owner_id: "untrusted-owner", dates: [{ date: "2026-10-01" }],
      practiceDates: [{ date: "2026-09-30" }],
    });
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.equal(data.id, projectId); assert.equal(data.owner_id, actorId);
    const dates = calls.find(call => call.dates)?.dates;
    assert.deepEqual(JSON.parse(JSON.stringify(dates.map(row => [row.project_id, row.kind, row.sort_order]))),
      [[projectId, "event", 0], [projectId, "practice", 1]]);
    assert.ok(calls.indexOf("read-created") < calls.indexOf("activity"));
    assert.equal(calls.filter(call => call === "notify").length, 1);
  });
}

for (const status of [401, 403]) {
  test(`project creation retains the ${status} authorization gate`, async () => {
    const { calls, post } = await setup({ guard: NextResponse.json({ error: "denied" }, { status }) });
    assert.equal((await post({ title: "Denied", type: "practice" })).status, status);
    assert.equal(calls.length, 0);
  });
}

test("insert failure does not read, write schedules, or send notifications", async () => {
  const { calls, post } = await setup({ insertError: { code: "42501", message: "denied" } });
  assert.equal((await post({ title: "Denied", type: "practice" })).status, 500);
  assert.equal(calls.length, 2);
});

test("a post-insert read failure identifies the saved project and warns against duplicate creation", async () => {
  const { calls, post } = await setup({ readError: { message: "connection failed" } });
  const response = await post({ title: "Saved", type: "practice" });
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal(result.project_id, projectId);
  assert.match(result.error, /다시 생성하지 말고/);
  assert.ok(!calls.includes("activity") && !calls.includes("notify"));
});
