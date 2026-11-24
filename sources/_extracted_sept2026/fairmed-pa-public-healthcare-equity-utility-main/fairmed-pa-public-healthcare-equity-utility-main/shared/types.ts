export interface DemoItem {
  id: string;
  name: string;
  value: number;
}
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface BenchmarkItem {
  cptCode: string;
  description: string;
  region: string;
  facility?: string;
  fairMarketValue: number;
  medicareRate: number;
  fmvMultiplier: number;
  zipCodes: string[];
}
export interface UpcodingFlag {
  detected: boolean;
  severity: 'Low' | 'Medium' | 'High';
  reason?: string;
  clinicalStandard?: string;
  recommendedCpt?: string;
  potentialOvercharge: number;
  fraudRiskScore: number;
  fraudRiskLevel: 'Low' | 'Medium' | 'High';
}
export interface AppealDraft {
  subject: string;
  body: string;
}
export interface AuditRequest {
  cptCode: string;
  zipCode: string;
  billedAmount: number;
  diagnosis?: string;
}
export interface AuditResponse {
  fairnessScore: number;
  benchmark: BenchmarkItem;
  variance: number;
  medicareComparison: {
    ratio: number;
    percentAboveMedicare: number;
  };
  locality: string;
  upcoding: UpcodingFlag;
  appeal: AppealDraft;
  timestamp: string;
  dataSource: string;
}
export interface FacilityStats {
  facilityName: string;
  region: string;
  avgOvercharge: number;
  avgMultiplier: number;
  medianPrice: number;
  varianceIndex: number;
  valueScore: number;
  percentile: number;
  auditCount: number;
  reliability: number;
  trend: number;
}
export interface AppealLog {
  id: string;
  timestamp: string;
  cptCode: string;
  billedAmount: number;
  projectedSavings: number;
  status: 'Generated' | 'Sent' | 'Resolved';
  resolutionAmount?: number;
}
/** Phase 6: Forensic Claim Ledger & Ingestion */
export interface ClaimLedgerEntry {
  id: string;
  tenantId: string; // e.g., 'PA_PUBLIC'
  patientToken: string; // HMAC-SHA256 truncated
  cptCode: string;
  billedAmount: number;
  locality: string;
  status: 'PENDING' | 'AUDITED' | 'FLAGGED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
  x12Metadata?: {
    segment: string;
    controlNumber?: string;
  };
  fhirReference?: string;
}
export interface IngestChunkRequest {
  chunk: string;
  patientRef?: string;
}
export interface ForensicAuditResult {
  ledgerId: string;
  variance: number;
  benchmarkFmv: number;
  status: 'AUDITED' | 'FLAGGED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface PayerIngestRequest {
  payer: 'Highmark' | 'UPMC' | 'IBC' | 'Aetna' | 'CIGNA';
  sourceUrl: string;
  records: number;
}
export interface IngestReport {
  timestamp: string;
  recordsProcessed: number;
  newBenchmarks: number;
  sourceUrl: string;
}