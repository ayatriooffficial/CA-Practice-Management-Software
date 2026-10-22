/**
 * verify-api.ts  (npm run verify:b2)
 * Talks to the RUNNING server at http://localhost:5000/api/v1
 * and asserts the B2 verification checks.
 * Run with:  npm run seed:nc  (first time), then  npm run verify:b2
 */

const BASE = 'http://localhost:5000/api/v1';

type CheckResult = { name: string; status: 'PASS' | 'FAIL' | 'NOT RUN'; error?: string };

const results: CheckResult[] = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ PASS  ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, status: 'FAIL', error: msg });
    console.error(`  ✗ FAIL  ${name}: ${msg}`);
  }
}

async function fetchJson(path: string, opts?: RequestInit) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  const json = await res.json() as Record<string, unknown>;
  return { res, json };
}

function assertEnvelope(json: Record<string, unknown>) {
  if (typeof json.success !== 'boolean') throw new Error('Missing `success` field');
  if (typeof json.statusCode !== 'number') throw new Error('Missing `statusCode` field');
  if (typeof json.message !== 'string') throw new Error('Missing `message` field');
}

async function main() {
  console.log('\n=== B2 API Verification ===\n');

  // ---- Health ----------------------------------------------------------------
  await check('GET /health returns envelope', async () => {
    const { json } = await fetchJson('/health');
    assertEnvelope(json);
    if ((json.data as Record<string, unknown>)?.status !== 'healthy') {
      throw new Error('status != healthy');
    }
  });

  // ---- Notices ---------------------------------------------------------------
  await check('GET /notices returns envelope + data array + pagination', async () => {
    const { json } = await fetchJson('/notices');
    assertEnvelope(json);
    if (!Array.isArray(json.data)) throw new Error('data is not an array');
    if (typeof json.pagination !== 'object') throw new Error('Missing pagination');
  });

  await check('GET /notices?portal=GST returns GST notices', async () => {
    const { json } = await fetchJson('/notices?portal=GST');
    assertEnvelope(json);
    const arr = json.data as unknown[];
    if (!Array.isArray(arr)) throw new Error('data not an array');
    for (const n of arr) {
      if ((n as Record<string, unknown>).portal && (n as Record<string, unknown>).portal !== 'GST') {
        throw new Error('Non-GST notice in GST portal response');
      }
    }
  });

  await check('GET /notices/summary returns count keys', async () => {
    const { json } = await fetchJson('/notices/summary');
    assertEnvelope(json);
    const d = json.data as Record<string, unknown>;
    const requiredKeys = ['total', 'new', 'closed'];
    for (const k of requiredKeys) {
      if (typeof d[k] !== 'number') throw new Error(`Missing numeric key: ${k}`);
    }
  });

  await check('GET /notices/clients returns data + counts', async () => {
    const { json } = await fetchJson('/notices/clients');
    assertEnvelope(json);
    const d = json.data as Record<string, unknown>;
    if (!Array.isArray(d.data)) throw new Error('data.data is not array');
    if (typeof d.counts !== 'object') throw new Error('Missing counts');
    const counts = d.counts as Record<string, unknown>;
    if (typeof counts.all !== 'number') throw new Error('Missing counts.all');
    if (typeof counts.notices !== 'number') throw new Error('Missing counts.notices');
    if (typeof counts.issues !== 'number') throw new Error('Missing counts.issues');
  });

  await check('GET /notices/credits returns credits + plan', async () => {
    const { json } = await fetchJson('/notices/credits');
    assertEnvelope(json);
    const d = json.data as Record<string, unknown>;
    if (typeof d.credits !== 'number') throw new Error('Missing credits');
    if (typeof d.plan !== 'string') throw new Error('Missing plan');
  });

  await check('GET /notices/calendar returns array', async () => {
    const { json } = await fetchJson('/notices/calendar?month=2026-10');
    assertEnvelope(json);
    if (!Array.isArray(json.data)) throw new Error('data is not an array');
  });

  await check('GET /notices?groupBy=client returns groups', async () => {
    const { json } = await fetchJson('/notices?groupBy=client&portal=GST');
    assertEnvelope(json);
    if (!Array.isArray(json.data)) throw new Error('data not array');
    for (const g of json.data as unknown[]) {
      const group = g as Record<string, unknown>;
      if (typeof group.client !== 'object') throw new Error('Missing group.client');
      if (!Array.isArray(group.notices)) throw new Error('Missing group.notices');
    }
  });

  await check('GET /notices bad param returns 4xx', async () => {
    const { res } = await fetchJson('/notices?sortOrder=bad');
    if (res.status !== 400 && res.status !== 422) throw new Error(`Expected 400/422, got ${res.status}`);
  });

  // ---- Sync ------------------------------------------------------------------
  await check('GET /sync/entitlement returns credits', async () => {
    const { json } = await fetchJson('/sync/entitlement');
    assertEnvelope(json);
    const d = json.data as Record<string, unknown>;
    if (typeof d.credits !== 'number') throw new Error('Missing credits');
    if (typeof d.cooldownDays !== 'number') throw new Error('Missing cooldownDays');
  });

  await check('GET /sync/jobs returns paginated list', async () => {
    const { json } = await fetchJson('/sync/jobs');
    assertEnvelope(json);
    if (!Array.isArray(json.data)) throw new Error('data not array');
    if (typeof json.pagination !== 'object') throw new Error('Missing pagination');
  });

  await check('GET /sync/activity returns paginated list', async () => {
    const { json } = await fetchJson('/sync/activity');
    assertEnvelope(json);
    if (!Array.isArray(json.data)) throw new Error('data not array');
    if (typeof json.pagination !== 'object') throw new Error('Missing pagination');
  });

  await check('POST /sync/clients without body returns 4xx', async () => {
    const { res } = await fetchJson('/sync/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400 && res.status !== 422) throw new Error(`Expected 400/422, got ${res.status}`);
  });

  // ---- Compliance ------------------------------------------------------------
  await check('GET /compliance/categories returns array', async () => {
    const { json } = await fetchJson('/compliance/categories');
    assertEnvelope(json);
    if (!Array.isArray(json.data)) throw new Error('data not array');
    if ((json.data as unknown[]).length === 0) throw new Error('No categories seeded');
  });

  await check('GET /compliance/grid returns clients + rows + columns + entries', async () => {
    const { json } = await fetchJson('/compliance/grid?categoryId=cat-gst&fy=FY%202025-2026');
    assertEnvelope(json);
    const d = json.data as Record<string, unknown>;
    if (!Array.isArray(d.clients)) throw new Error('Missing clients');
    if (!Array.isArray(d.rows)) throw new Error('Missing rows');
    if (!Array.isArray(d.columns)) throw new Error('Missing columns');
    if (!Array.isArray(d.entries)) throw new Error('Missing entries');
  });

  await check('PUT /compliance/entries on auto category returns 400', async () => {
    // Get first compliance item from GST (auto) category
    const { json: grid } = await fetchJson('/compliance/grid?categoryId=cat-gst&fy=FY%202025-2026');
    const rows = (grid.data as Record<string, unknown>).rows as unknown[];
    if (rows.length === 0) {
      console.log('    (no rows seeded for cat-gst, skipping PUT test)');
      return;
    }
    const itemId = (rows[0] as Record<string, unknown>).itemId as string;
    const { res } = await fetchJson('/compliance/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId,
        fy: 'FY 2025-2026',
        periodKey: '2025-04',
        dueDate: '2025-05-20',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 (auto category), got ${res.status}`);
  });

  await check('POST /compliance/items/refresh returns retired count', async () => {
    const { json } = await fetchJson('/compliance/items/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assertEnvelope(json);
    const d = json.data as Record<string, unknown>;
    if (typeof d.retired !== 'number') throw new Error('Missing retired count');
  });

  // ---- Summary ---------------------------------------------------------------
  console.log('\n=== Results ===');
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
    console.log(`  ${icon} ${r.status.padEnd(8)} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log(`\n  ${pass}/${results.length} PASS  |  ${fail} FAIL\n`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
