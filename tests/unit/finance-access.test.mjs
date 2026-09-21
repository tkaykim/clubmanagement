import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {
  canEnterFinance,
  canReadFinanceProject,
  isActiveFinanceOperator,
} from "../../lib/finance-access.ts";

const assignedProject = "project-a";

function access(overrides = {}) {
  return {
    isGlobal: false,
    isOperator: false,
    managedProjectIds: [],
    ...overrides,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadTypeScriptModule(relativePath, mocks) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: relativePath,
  }).outputText;
  const testModule = { exports: {} };
  const require = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    throw new Error(`Unexpected dependency in ${relativePath}: ${specifier}`);
  };
  const wrapper = vm.runInNewContext(
    `(function (exports, require, module) { ${output}\n})`,
    { URL, Request, Response, console, setTimeout, clearTimeout },
    { filename: relativePath }
  );
  wrapper(testModule.exports, require, testModule);
  return testModule.exports;
}

test("only active owner/admin crew members qualify as finance operators", () => {
  assert.equal(isActiveFinanceOperator({ role: "owner", is_active: true }), true);
  assert.equal(isActiveFinanceOperator({ role: "admin", is_active: true }), true);
  assert.equal(isActiveFinanceOperator({ role: "member", is_active: true }), false);
  assert.equal(isActiveFinanceOperator({ role: "owner", is_active: false }), false);
  assert.equal(isActiveFinanceOperator({ role: "admin", is_active: null }), false);
  assert.equal(isActiveFinanceOperator(null), false);
});

test("page entry is broader than private project read access", () => {
  const operator = access({ isOperator: true });
  assert.equal(canEnterFinance(operator), true);
  assert.equal(canReadFinanceProject(operator, assignedProject), false);

  const manager = access({ managedProjectIds: [assignedProject] });
  assert.equal(canEnterFinance(manager), true);
  assert.equal(canReadFinanceProject(manager, assignedProject), true);
  assert.equal(canReadFinanceProject(manager, "project-b"), false);

  const global = access({ isGlobal: true });
  assert.equal(canEnterFinance(global), true);
  assert.equal(canReadFinanceProject(global, "any-project"), true);

  assert.equal(canEnterFinance(access()), false);
  assert.equal(canEnterFinance(null), false);
});

test("an unassigned operator gets an empty project list without touching finance tables", async () => {
  let clientCreations = 0;
  const financeAccess = { canReadFinanceProject, isActiveFinanceOperator };
  const server = await loadTypeScriptModule("../../lib/finance-server.ts", {
    "next/server": {
      NextResponse: class NextResponse extends Response {
        static json(body, init) {
          return new Response(JSON.stringify(body), init);
        }
      },
    },
    "@/lib/auth": { getSession: async () => null },
    "@/lib/supabase-server": {
      createRouteSupabaseClient() {
        clientCreations += 1;
        throw new Error("an empty operator scope must not create a database client");
      },
    },
    "@/lib/finance": { deriveFinancePaymentStatus: () => "not_paid" },
    "@/lib/finance-access": financeAccess,
    "@/lib/finance-types": {},
  });

  const operator = {
    userId: "operator-user",
    email: "operator@example.test",
    ...access({ isOperator: true }),
  };
  assert.deepEqual(plain(await server.getFinanceProjects(operator)), {
    data: [],
    nextCursor: null,
  });
  assert.equal(
    await server.getFinanceProjectDetail(assignedProject, operator, {
      from() {
        throw new Error("an unauthorized detail read must not query a table");
      },
    }),
    null
  );
  assert.equal(clientCreations, 0);
});

test("access and list routes admit an operator while preserving an empty scope", async () => {
  const identity = {
    userId: "operator-user",
    email: "operator@example.test",
    ...access({ isOperator: true }),
  };
  const financeAccess = { canEnterFinance, canReadFinanceProject, isActiveFinanceOperator };
  const json = (body, status = 200) => ({ body, status });

  const accessRoute = await loadTypeScriptModule("../../app/api/finance/access/route.ts", {
    "@/lib/finance-server": {
      getFinanceIdentity: async () => identity,
      financeJson: json,
    },
    "@/lib/finance-access": financeAccess,
  });
  assert.deepEqual(plain(await accessRoute.GET()), {
    status: 200,
    body: {
      data: {
        authenticated: true,
        canAccessFinance: true,
        isGlobal: false,
        managedProjectIds: [],
      },
    },
  });

  let listCalls = 0;
  const projectsRoute = await loadTypeScriptModule("../../app/api/finance/projects/route.ts", {
    "@/lib/auth": { isNextResponse: () => false },
    "@/lib/finance-access": financeAccess,
    "@/lib/finance-server": {
      requireFinanceIdentity: async () => identity,
      getFinanceProjects: async () => {
        listCalls += 1;
        return { data: [], nextCursor: null };
      },
      financeJson: json,
      financeApiError: (status, code, error) => ({ status, body: { code, error } }),
    },
  });
  assert.deepEqual(plain(await projectsRoute.GET(new Request("https://crew.example.test/api/finance/projects"))), {
    status: 200,
    body: { data: [], access: "project_manager", nextCursor: null },
  });
  assert.equal(listCalls, 1);
});

test("finance lifecycle filtering keeps paid, unarchived and assigned scopes before pagination", async () => {
  const calls = [];
  const query = { then(resolve) { return Promise.resolve({ data: [] }).then(resolve); } };
  for (const method of ["select", "neq", "eq", "is", "order", "limit", "in", "gt"]) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  const server = await loadTypeScriptModule("../../lib/finance-server.ts", {
    "next/server": {},
    "@/lib/auth": {},
    "@/lib/supabase-server": { createRouteSupabaseClient: () => ({ from: () => query }) },
    "@/lib/finance": {},
    "@/lib/finance-access": { canReadFinanceProject, isActiveFinanceOperator },
    "@/lib/finance-types": {},
  });
  const identity = { userId: "manager", ...access({ managedProjectIds: [assignedProject] }) };
  for (const eventStatus of [undefined, "active", "cancelled", "all", "invalid"]) {
    calls.length = 0;
    await server.getFinanceProjects(identity, { eventStatus, limit: 3, cursor: "cursor-id" });
    assert.ok(calls.some(([m, c, v]) => m === "neq" && c === "projects.pay_type" && v === "free"));
    assert.ok(calls.some(([m, c, v]) => m === "is" && c === "archived_at" && v === null));
    assert.ok(calls.some(([m, c, v]) => m === "in" && c === "project_id" && v.includes(assignedProject)));
    assert.ok(calls.some(([m, v]) => m === "limit" && v === 4));
    assert.ok(calls.some(([m, c, v]) => m === "gt" && c === "project_id" && v === "cursor-id"));
    const statusCalls = calls.filter(([, c]) => c === "projects.status");
    assert.deepEqual(plain(statusCalls), eventStatus === "all" ? [] : [[eventStatus === "cancelled" ? "eq" : "neq", "projects.status", "cancelled"]]);
  }
  calls.length = 0;
  await server.getFinanceProjects({ ...identity, managedProjectIds: [] }, { eventStatus: "all" });
  assert.equal(calls.length, 0, "all events must not widen an unassigned operator's scope");
});

test("finance list forwards event scope and distinguishes unpaid, partially paid, and paid", async () => {
  const fixtures = [
    { projectId: "unpaid", unpaidAmount: 100, paymentExecutedAmount: 0, confirmedGrossAmount: 100 },
    { projectId: "partial", unpaidAmount: 50, paymentExecutedAmount: 50, confirmedGrossAmount: 100 },
    { projectId: "paid", unpaidAmount: 0, paymentExecutedAmount: 100, confirmedGrossAmount: 100 },
    { projectId: "draft", unpaidAmount: 0, paymentExecutedAmount: 0, confirmedGrossAmount: 0 },
  ];
  const route = await loadTypeScriptModule("../../app/api/finance/projects/route.ts", {
    "@/lib/auth": { isNextResponse: () => false },
    "@/lib/finance-access": { canEnterFinance },
    "@/lib/finance-server": {
      requireFinanceIdentity: async () => access({ isGlobal: true }),
      getFinanceProjects: async (_identity, options) => {
        assert.equal(options.eventStatus, "cancelled");
        return { data: fixtures, nextCursor: "next-page" };
      },
      financeJson: (body) => body,
      financeApiError: () => { throw new Error("Unexpected access denial"); },
    },
  });
  for (const [status, expected] of [["not_paid", ["unpaid"]], ["partially_paid", ["partial"]], ["paid", ["paid"]], ["unpaid", ["unpaid", "partial"]]]) {
    const result = await route.GET(new Request(`https://crew.example.test/api/finance/projects?eventStatus=cancelled&paymentStatus=${status}`));
    assert.deepEqual(plain(result.data.map((r) => r.projectId)), expected);
    assert.equal(result.nextCursor, "next-page");
  }
});
