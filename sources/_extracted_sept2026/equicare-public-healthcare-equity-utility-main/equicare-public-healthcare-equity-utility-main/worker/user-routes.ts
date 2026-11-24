import { Hono } from "hono";
import type { Env } from './core-utils';
import { BenchmarkEntity, ClaimLedgerEntity, AppealEntity, ConsensusEntity, ManifestEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import { MOCK_TENANTS, MOCK_HOSPITALS } from "@shared/mock-data";
async function hmacToken(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode('equicare-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/health', (c) => ok(c, { 
    status: 'healthy', 
    phase: 'complete', 
    version: 'PA-2026-FINAL',
    tenants_active: MOCK_TENANTS.length,
    timestamp: new Date().toISOString() 
  }));
  app.get('/api/tenants', (c) => ok(c, MOCK_TENANTS));
  app.get('/api/wall-of-value', async (c) => {
    const locality = c.req.query('locality') || 'PA01';
    const filtered = MOCK_HOSPITALS.filter(h => h.locality === locality);
    return ok(c, filtered.sort((a, b) => a.rank - b.rank));
  });
  app.get('/api/manifests', async (c) => {
    await ManifestEntity.ensureSeed(c.env);
    const { items } = await ManifestEntity.list(c.env, null, 100);
    return ok(c, items);
  });
  app.post('/api/publish-manifest', async (c) => {
    const { payer } = await c.req.json();
    const id = crypto.randomUUID();
    const publishedAt = Date.now();
    const signature = await hmacToken(`${payer}-${publishedAt}`);
    const manifest = await ManifestEntity.create(c.env, {
      id,
      payer,
      s3Key: `transparency/${payer.toLowerCase()}-${publishedAt}.json`,
      signature,
      publishedAt,
      procedureCount: 1200 + Math.floor(Math.random() * 5000)
    });
    return ok(c, manifest);
  });
  app.post('/api/scrape-payers', async (c) => {
    const { payer } = await c.req.json();
    const codes = ['99214', '72141', '45378'];
    const results = [];
    for (const code of codes) {
      const id = `bm:${code}:PA01`;
      const entity = new BenchmarkEntity(c.env, id);
      const medianAllowed = 150 + Math.random() * 800;
      const updated = await entity.mutate(s => ({
        ...s,
        payer,
        medianAllowed,
        p10: medianAllowed * 0.8,
        p90: medianAllowed * 1.3,
        varianceIndex: Math.random() * 40
      }));
      results.push(updated);
    }
    return ok(c, { count: results.length, payer, status: 'UPSERTED' });
  });
  app.post('/api/simulate/claims', async (c) => {
    const { tenantId, count = 100 } = await c.req.json();
    const limit = Math.min(count, 500); // Protection for demo
    for (let i = 0; i < limit; i++) {
      await ClaimLedgerEntity.create(c.env, {
        id: crypto.randomUUID(),
        tenantId,
        token: await hmacToken(`BULK_${Math.random()}`),
        cpt: ['99214', '72141', '45378'][Math.floor(Math.random() * 3)],
        billedAmount: 200 + Math.random() * 1500,
        locality: 'PA01',
        status: 'AUDITED',
        fmvResult: 150 + Math.random() * 500,
        riskLevel: Math.random() > 0.8 ? 'HIGH' : Math.random() > 0.5 ? 'MED' : 'LOW',
        timestamp: Date.now() - (Math.random() * 10000000)
      });
    }
    return ok(c, { status: 'SIMULATED', count: limit });
  });
  app.get('/api/appeals', async (c) => {
    await AppealEntity.ensureSeed(c.env);
    const tenantId = c.req.query('tenant_id');
    const { items } = await AppealEntity.list(c.env, null, 100);
    const filtered = tenantId ? items.filter(a => a.tenantId === tenantId) : items;
    return ok(c, filtered);
  });
  app.post('/api/appeals', async (c) => {
    const data = await c.req.json();
    const appeal = await AppealEntity.create(c.env, {
      ...data,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'PENDING'
    });
    return ok(c, appeal);
  });
  app.get('/api/consensus', async (c) => {
    await ConsensusEntity.ensureSeed(c.env);
    const { items } = await ConsensusEntity.list(c.env, null, 100);
    return ok(c, items);
  });
  app.post('/api/map-cpt', async (c) => {
    const { id } = await c.req.json();
    const entity = new ConsensusEntity(c.env, id);
    if (!(await entity.exists())) return notFound(c);
    const updated = await entity.mutate(s => ({ ...s, votes: s.votes + 1 }));
    return ok(c, updated);
  });
  app.get('/api/ledger', async (c) => {
    await ClaimLedgerEntity.ensureSeed(c.env);
    const tenantId = c.req.query('tenant_id');
    const { items } = await ClaimLedgerEntity.list(c.env, null, 100);
    const filtered = tenantId ? items.filter(cl => cl.tenantId === tenantId) : items;
    return ok(c, filtered);
  });
  app.post('/api/ingest/837', async (c) => {
    const { tenantId } = await c.req.json();
    const id = crypto.randomUUID();
    const claim = await ClaimLedgerEntity.create(c.env, {
      id,
      tenantId,
      token: await hmacToken(`PATIENT_${Math.random()}`),
      cpt: '99214',
      billedAmount: 250 + (Math.random() * 100),
      locality: 'PA01',
      status: 'PENDING',
      riskLevel: 'LOW',
      timestamp: Date.now()
    });
    return ok(c, { count: 1, status: 'INGESTED', last: claim });
  });
}