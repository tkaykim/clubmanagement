/* Isolated HTTP upstream for real Next.js middleware, SSR, APIs and browser tests.
 * It intentionally returns a private sentinel for any ledger read: entry-only
 * operators must never reach it. This is NOT a test of production Supabase RLS.
 */
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const roles = ['admin', 'owner', 'member'];
const users = roles.map((role, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  email: `${role}@example.test`, aud: 'authenticated', role: 'authenticated',
  user_metadata: {}, app_metadata: {}, created_at: '2026-09-20T00:00:00Z',
}));
const tokens = new Map();
const projects = new Map();
let ledgerReads = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.end();
  const reply = (value, status = 200) => { res.statusCode = status; res.end(JSON.stringify(value)); };
  if (url.pathname === '/auth/v1/token') {
    let text = ''; for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    const user = users.find(item => item.email === body.email || `local-only-${item.id}` === body.refresh_token);
    if (!user) return reply({ message: 'Unknown isolated test user' }, 401);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.local-test-signature`;
    tokens.set(token, user);
    return reply({ access_token: token, refresh_token: `local-only-${user.id}`, expires_in: 3600, expires_at: exp, token_type: 'bearer', user });
  }
  const user = tokens.get((req.headers.authorization || '').replace('Bearer ', ''));
  if (url.pathname === '/auth/v1/user') return reply(user || { message: 'Not authenticated' }, user ? 200 : 401);
  if (url.pathname === '/auth/v1/logout') return reply({});
  if (url.pathname === '/rest/v1/rpc/finance_is_global') return reply(false);
  if (url.pathname === '/rest/v1/projects') {
    if (req.method === 'POST') {
      if (!user || !['admin', 'owner'].includes(user.email.split('@')[0])) return reply({ code: '42501', message: 'denied' }, 403);
      if (req.headers.prefer?.includes('return=representation')) return reply({ code: '42501', message: 'new row violates row-level security policy for table projects' }, 403);
      let raw = ''; for await (const chunk of req) raw += chunk;
      const row = JSON.parse(raw);
      projects.set(row.id, { ...row, status: 'recruiting', created_at: new Date().toISOString() });
      return reply(null, 201);
    }
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    const row = projects.get(id);
    return reply(req.headers.accept?.includes('object') ? row ?? null : row ? [row] : []);
  }
  if (url.pathname === '/rest/v1/crew_members') {
    const role = user?.email.split('@')[0] || 'member';
    const member = { id: user?.id, user_id: user?.id, name: `Test ${role}`, stage_name: null, role, is_active: true, contract_type: 'member' };
    return reply(req.headers.accept?.includes('object') ? member : [member]);
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.split('/').pop();
    if (table === 'project_finance' || table === 'finance_allowance_items') {
      ledgerReads++;
      return reply([{ project_id: 'PRIVATE_LEDGER_SENTINEL', budget_amount: 987654321 }]);
    }
    res.setHeader('Content-Range', '*/0');
    return reply(req.headers.accept?.includes('object') ? null : []);
  }
  return reply({});
});

const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon', SUPABASE_SERVICE_ROLE_KEY: '', FINANCE_OPERATOR_LOCAL: '1', BASE_URL: 'http://localhost:3021' };
let app;
const stop = () => { if (app) app.kill(); server.close(); };
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });
server.listen(54329, '127.0.0.1', async () => {
  app = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--port', '3021'], { cwd: repo, env, stdio: 'inherit', windowsHide: true });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      try { const r = await fetch(`${env.BASE_URL}/login`); if (r.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Local isolated app did not start');
    const test = spawn(process.execPath, [path.join(repo, 'node_modules/@playwright/test/cli.js'), 'test', 'tests/e2e/finance-operator-entry.spec.ts', 'tests/e2e/project-create-rls.spec.ts', '--workers=1', '--reporter=line'], { cwd: repo, env, stdio: 'inherit', windowsHide: true });
    const code = await new Promise(resolve => test.on('exit', resolve));
    console.log(`Isolated operator test ledger reads: ${ledgerReads}`);
    process.exitCode = code === 0 && ledgerReads === 0 ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { stop(); }
});
