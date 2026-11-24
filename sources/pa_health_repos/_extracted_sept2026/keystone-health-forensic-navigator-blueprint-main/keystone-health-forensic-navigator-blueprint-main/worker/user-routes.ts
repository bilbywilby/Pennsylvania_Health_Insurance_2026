import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ForensicRecordEntity } from "./entities";
import { ok, bad } from './core-utils';
import type { DashboardStats, ForensicRecord, CarrierTrendPoint } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'Keystone API' }}));
  // FORENSIC RECORDS
  app.get('/api/audit-records', async (c) => {
    const page = await ForensicRecordEntity.list(c.env, c.req.query('cursor') ?? null, 50);
    return ok(c, page);
  });
  app.post('/api/audit-records', async (c) => {
    const body = (await c.req.json()) as ForensicRecord;
    if (!body.id || !body.recordHash) return bad(c, 'Invalid record payload');
    const record = await ForensicRecordEntity.create(c.env, body);
    return ok(c, record);
  });
  app.get('/api/audit-stats', async (c) => {
    const { items } = await ForensicRecordEntity.list(c.env, null, 100);
    // Simulate multi-carrier trends for the last 6 periods
    const carriers = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const multiCarrierTrends: CarrierTrendPoint[] = carriers.map((month, i) => ({
      timestamp: month,
      highmark: 12000 + (Math.random() * 2000),
      upmc: 11500 + (Math.random() * 3000),
      geisinger: 13000 + (Math.random() * 1500),
      marketAvg: 12200 + (Math.random() * 1000)
    }));
    const volatilityIndex = 8.2 + (Math.random() * 2);
    const vClass = volatilityIndex > 9.5 ? 'Critical' : volatilityIndex > 7.0 ? 'Elevated' : 'Nominal';
    const stats: DashboardStats = {
      totalVarianceCents: items.reduce((sum, r) => sum + Math.max(0, r.variance.diff), 0),
      sealedAuditCount: items.length,
      marketVolatilityIndex: parseFloat(volatilityIndex.toFixed(1)),
      volatilityClass: vClass as any,
      riskScore: Math.floor(65 + (Math.random() * 20)),
      marketNarrative: "Highmark E&M clusters in Rating Area 4 showing 12% deviation from 2026 CMS baseline. Geisinger filings pending DOH review.",
      multiCarrierTrends,
      recentRecords: items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
    };
    return ok(c, stats);
  });
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const page = await UserEntity.list(c.env, c.req.query('cursor') ?? null);
    return ok(c, page);
  });
}