import { Hono } from "hono";
import { Env } from './core-utils';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/benchmarks/search', async (c) => {
    const query = c.req.query('q') || '';
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.searchBenchmarks(query);
    return c.json({ success: true, data });
  });
  app.get('/api/benchmarks/state-averages', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.getStateAverages();
    return c.json({ success: true, data });
  });
  app.get('/api/benchmarks/last-sync', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.getLastIngestReport();
    return c.json({ success: true, data });
  });
  /** Phase 6: Forensic Ingestion & Ledger */
  app.post('/api/ingest', async (c) => {
    const body = await c.req.json();
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.processIngestChunk(body);
    return c.json({ success: true, data });
  });
  app.get('/api/ledger', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.getClaimLedger();
    return c.json({ success: true, data });
  });
  app.post('/api/ledger/audit', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const count = await stub.runBatchAudit();
    const data = await stub.getClaimLedger();
    return c.json({ success: true, data, auditedCount: count });
  });
  app.post('/api/audit', async (c) => {
    const body = await c.req.json();
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.auditBill(body);
    return c.json({ success: true, data });
  });
  app.post('/api/scrape', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.ingestPayerMRF({
      payer: 'Highmark',
      sourceUrl: 'https://transparency-in-coverage.highmark.com',
      records: 1200
    });
    return c.json({ success: true, data });
  });
  app.get('/api/transparency', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.getFacilityTransparency();
    return c.json({ success: true, data });
  });
  app.get('/api/counter', async (c) => {
    const stub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    const data = await stub.getCounterValue();
    return c.json({ success: true, data });
  });
}