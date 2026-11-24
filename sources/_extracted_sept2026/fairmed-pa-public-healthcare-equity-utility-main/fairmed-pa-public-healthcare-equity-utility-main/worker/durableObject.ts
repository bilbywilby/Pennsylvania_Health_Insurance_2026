import { DurableObject } from "cloudflare:workers";
import type {
  BenchmarkItem,
  AuditRequest,
  AuditResponse,
  UpcodingFlag,
  AppealDraft,
  FacilityStats,
  IngestReport,
  PayerIngestRequest,
  ClaimLedgerEntry,
  IngestChunkRequest
} from '@shared/types';
const INITIAL_BENCHMARKS: BenchmarkItem[] = [
  { cptCode: '99213', description: 'Office Visit Low Complexity', region: 'Lehigh Valley', facility: 'Lehigh Valley Health Network', fairMarketValue: 125, medicareRate: 75, fmvMultiplier: 1.6, zipCodes: ['18104', '18103'] },
  { cptCode: '99214', description: 'Office Visit Moderate Complexity', region: 'Lehigh Valley', facility: 'St. Lukes University Health', fairMarketValue: 185, medicareRate: 110, fmvMultiplier: 1.7, zipCodes: ['18015', '18017'] },
  { cptCode: '99215', description: 'Office Visit High Complexity', region: 'Philadelphia', facility: 'Penn Medicine', fairMarketValue: 295, medicareRate: 150, fmvMultiplier: 1.9, zipCodes: ['19104', '19103'] },
  { cptCode: '73721', description: 'MRI Lower Joint', region: 'Philadelphia', facility: 'Jefferson Health', fairMarketValue: 850, medicareRate: 380, fmvMultiplier: 2.2, zipCodes: ['19147'] },
  { cptCode: '99215', description: 'Office Visit High Complexity', region: 'Pittsburgh', facility: 'UPMC Presbyterian', fairMarketValue: 310, medicareRate: 145, fmvMultiplier: 2.1, zipCodes: ['15213'] },
  { cptCode: '99215', description: 'Office Visit High Complexity', region: 'Pittsburgh', facility: 'Allegheny General', fairMarketValue: 280, medicareRate: 145, fmvMultiplier: 1.9, zipCodes: ['15212'] },
  { cptCode: '70450', description: 'CT Head', region: 'Harrisburg', facility: 'UPMC Pinnacle', fairMarketValue: 420, medicareRate: 175, fmvMultiplier: 2.4, zipCodes: ['17101'] },
  { cptCode: '70450', description: 'CT Head', region: 'Erie', facility: 'Saint Vincent Hospital', fairMarketValue: 390, medicareRate: 170, fmvMultiplier: 2.3, zipCodes: ['16502'] },
  { cptCode: '93000', description: 'EKG', region: 'Scranton', facility: 'Geisinger CMC', fairMarketValue: 75, medicareRate: 25, fmvMultiplier: 3.0, zipCodes: ['18510'] },
];
export class GlobalDurableObject extends DurableObject {
  private async getBenchmarks(): Promise<BenchmarkItem[]> {
    const stored = await this.ctx.storage.get<BenchmarkItem[]>("pa_benchmarks");
    if (!stored) {
      await this.ctx.storage.put("pa_benchmarks", INITIAL_BENCHMARKS);
      return INITIAL_BENCHMARKS;
    }
    return stored;
  }
  private async generatePatientToken(ref: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("fairmed-secret-2026"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ref));
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12).toUpperCase();
  }
  private calculateRiskLevel(ratio: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (ratio > 1.5) return 'HIGH';
    if (ratio > 1.2) return 'MEDIUM';
    return 'LOW';
  }
  async processIngestChunk(req: IngestChunkRequest): Promise<ClaimLedgerEntry[]> {
    const claims: Partial<ClaimLedgerEntry>[] = [];
    const patientToken = await this.generatePatientToken(req.patientRef || "ANON-" + Math.random());
    const segments = req.chunk.split('~');
    segments.forEach(seg => {
      if (seg.includes('SV1*HC:')) {
        const parts = seg.split('*');
        const cptPart = parts[1]?.replace('HC:', '');
        const amountPart = parts[2];
        if (cptPart && amountPart) {
          claims.push({
            cptCode: cptPart,
            billedAmount: parseFloat(amountPart),
            patientToken,
            tenantId: 'PA_PUBLIC',
            locality: 'PA-LOCAL-01',
            status: 'PENDING',
            riskLevel: 'LOW',
            timestamp: new Date().toISOString(),
            x12Metadata: { segment: seg }
          });
        }
      }
    });
    if (claims.length > 0) {
      return await this.ingestClaimBatch(claims);
    }
    return [];
  }
  async ingestClaimBatch(claims: Partial<ClaimLedgerEntry>[]): Promise<ClaimLedgerEntry[]> {
    const entries: ClaimLedgerEntry[] = claims.map(c => ({
      id: crypto.randomUUID(),
      tenantId: c.tenantId || 'PA_PUBLIC',
      patientToken: c.patientToken || 'UNKNOWN',
      cptCode: c.cptCode || '00000',
      billedAmount: c.billedAmount || 0,
      locality: c.locality || 'PA-GLOBAL',
      status: 'PENDING',
      riskLevel: 'LOW',
      timestamp: c.timestamp || new Date().toISOString(),
      x12Metadata: c.x12Metadata
    }));
    for (const entry of entries) {
      await this.ctx.storage.put(`claim_ledger:${entry.id}`, entry);
    }
    return entries;
  }
  async runBatchAudit(): Promise<number> {
    const benchmarks = await this.getBenchmarks();
    const ledger = await this.ctx.storage.list<ClaimLedgerEntry>({ prefix: 'claim_ledger:' });
    let count = 0;
    for (const [key, entry] of ledger.entries()) {
      if (entry.status === 'PENDING') {
        const benchmark = benchmarks.find(b => b.cptCode === entry.cptCode) || benchmarks[0];
        const fmv = benchmark.medicareRate * benchmark.fmvMultiplier;
        const ratio = entry.billedAmount / fmv;
        const updated: ClaimLedgerEntry = {
          ...entry,
          status: 'AUDITED',
          riskLevel: this.calculateRiskLevel(ratio)
        };
        await this.ctx.storage.put(key, updated);
        count++;
      }
    }
    return count;
  }
  async getClaimLedger(): Promise<ClaimLedgerEntry[]> {
    const storage = await this.ctx.storage.list<ClaimLedgerEntry>({ prefix: 'claim_ledger:', limit: 50 });
    return Array.from(storage.values()).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  async searchBenchmarks(query: string): Promise<BenchmarkItem[]> {
    const benchmarks = await this.getBenchmarks();
    const q = query.toLowerCase();
    return benchmarks.filter(b =>
      b.cptCode.includes(q) ||
      b.description.toLowerCase().includes(q)
    );
  }
  async getStateAverages(): Promise<Record<string, number>> {
    const benchmarks = await this.getBenchmarks();
    const avgs: Record<string, { sum: number, count: number }> = {};
    benchmarks.forEach(b => {
      if (!avgs[b.cptCode]) avgs[b.cptCode] = { sum: 0, count: 0 };
      avgs[b.cptCode].sum += b.fairMarketValue;
      avgs[b.cptCode].count += 1;
    });
    return Object.fromEntries(Object.entries(avgs).map(([code, val]) => [code, val.sum / val.count]));
  }
  async getLastIngestReport(): Promise<IngestReport | { timestamp: null }> {
    const report = await this.ctx.storage.get<IngestReport>("last_ingest");
    return report || { timestamp: null };
  }
  async ingestPayerMRF(req: PayerIngestRequest): Promise<IngestReport> {
    const benchmarks = await this.getBenchmarks();
    const mockNew = [
      { cptCode: '99214', description: 'Office Visit Moderate', region: 'Scranton', facility: 'Geisinger South', fairMarketValue: 175, medicareRate: 105, fmvMultiplier: 1.6, zipCodes: ['18505'] }
    ];
    const updated = [...benchmarks, ...mockNew];
    await this.ctx.storage.put("pa_benchmarks", updated);
    const report = {
      timestamp: new Date().toISOString(),
      recordsProcessed: req.records || 500,
      newBenchmarks: mockNew.length,
      sourceUrl: req.sourceUrl
    };
    await this.ctx.storage.put("last_ingest", report);
    return report;
  }
  async auditBill(req: AuditRequest): Promise<AuditResponse> {
    const benchmarks = await this.getBenchmarks();
    const locality = this.getLocality(req.zipCode);
    const benchmark = benchmarks.find(b => b.cptCode === req.cptCode && b.zipCodes.includes(req.zipCode))
                      || benchmarks.find(b => b.cptCode === req.cptCode)
                      || { ...benchmarks[0], fairMarketValue: 150, medicareRate: 80, fmvMultiplier: 1.8, region: locality, facility: 'Regional Average' };
    const fmv = benchmark.medicareRate * benchmark.fmvMultiplier;
    const variance = req.billedAmount - fmv;
    const ratioToMedicare = req.billedAmount / benchmark.medicareRate;
    let upcoding: UpcodingFlag = { detected: false, severity: 'Low', potentialOvercharge: 0, fraudRiskScore: 10, fraudRiskLevel: 'Low' };
    const dx = (req.diagnosis || '').toLowerCase();
    if (req.cptCode === '99215' && (dx.includes('cough') || dx.includes('minor'))) {
      upcoding = {
        detected: true,
        severity: 'High',
        reason: 'High-complexity E/M (99215) billed for low-complexity diagnosis.',
        clinicalStandard: 'CMS Guidelines suggest 99213 for minor symptoms.',
        recommendedCpt: '99213',
        potentialOvercharge: req.billedAmount - (75 * 1.6),
        fraudRiskScore: 85,
        fraudRiskLevel: 'High'
      };
    }
    const ratioToFmv = req.billedAmount / fmv;
    const fairnessScore = Math.max(0, 100 - (ratioToMedicare - benchmark.fmvMultiplier) * 30 - (upcoding.detected ? 30 : 0));
    // Persistence: Save this manual audit to the claim ledger
    const manualToken = await this.generatePatientToken("MANUAL-" + req.zipCode + Date.now());
    const ledgerEntry: ClaimLedgerEntry = {
      id: crypto.randomUUID(),
      tenantId: 'PA_PUBLIC',
      patientToken: manualToken,
      cptCode: req.cptCode,
      billedAmount: req.billedAmount,
      locality,
      status: 'AUDITED',
      riskLevel: this.calculateRiskLevel(ratioToFmv),
      timestamp: new Date().toISOString()
    };
    await this.ctx.storage.put(`claim_ledger:${ledgerEntry.id}`, ledgerEntry);
    const appeal: AppealDraft = {
      subject: `Formal Dispute: Pricing Variance for CPT ${req.cptCode} in ${locality}`,
      body: `I am disputing the charge of ${req.billedAmount.toFixed(2)} for service ${req.cptCode}.\nMedicare rate: ${benchmark.medicareRate}. Locality multiplier: ${benchmark.fmvMultiplier}x.\nYour bill represents ${ratioToMedicare.toFixed(1)}x Medicare.\nPlease adjust this bill to ${fmv.toFixed(2)}.`
    };
    const facKey = `fac_${benchmark.facility || 'Unknown'}`;
    const existing = (await this.ctx.storage.get(facKey)) as any || { count: 0, totalVariance: 0, totalMultiplier: 0, region: benchmark.region, totalCost: 0 };
    await this.ctx.storage.put(facKey, {
      ...existing,
      count: existing.count + 1,
      totalVariance: existing.totalVariance + Math.max(0, variance),
      totalMultiplier: existing.totalMultiplier + ratioToMedicare,
      totalCost: existing.totalCost + req.billedAmount
    });
    return { fairnessScore, benchmark: { ...benchmark, fairMarketValue: fmv }, variance, medicareComparison: { ratio: ratioToMedicare, percentAboveMedicare: (ratioToMedicare - 1) * 100 }, locality, upcoding, appeal, timestamp: new Date().toISOString(), dataSource: 'PA DOI MRF Intelligence v2.1' };
  }
  private getLocality(zip: string): string {
    if (zip.startsWith('191')) return 'Philadelphia Metro';
    if (zip.startsWith('181') || zip.startsWith('180')) return 'Lehigh Valley';
    if (zip.startsWith('152')) return 'Pittsburgh Metro';
    if (zip.startsWith('171')) return 'Harrisburg/Central';
    if (zip.startsWith('165')) return 'Erie/NW';
    return 'Pennsylvania Standard';
  }
  async getFacilityTransparency(): Promise<FacilityStats[]> {
    const storage = await this.ctx.storage.list({ prefix: 'fac_' });
    const globalAvgMultiplier = 2.1;
    return Array.from(storage.entries()).map(([key, value]: [string, any]) => {
      const avgMultiplier = value.totalMultiplier / value.count;
      const medianPrice = value.totalCost / value.count;
      const varianceIndex = ((avgMultiplier - globalAvgMultiplier) / globalAvgMultiplier) * 100;
      return {
        facilityName: key.replace('fac_', ''),
        region: value.region || 'PA',
        avgOvercharge: value.totalVariance / value.count,
        avgMultiplier,
        medianPrice,
        varianceIndex,
        valueScore: Math.max(0, 100 - (varianceIndex > 0 ? varianceIndex * 2 : 0)),
        percentile: Math.min(100, Math.max(0, 50 + (varianceIndex / 2))),
        auditCount: value.count,
        reliability: Math.min(100, value.count * 10),
        trend: (Math.random() * 4) - 2
      };
    });
  }
  async getCounterValue(): Promise<number> {
    return (await this.ctx.storage.get("counter_value")) || 1248;
  }
}