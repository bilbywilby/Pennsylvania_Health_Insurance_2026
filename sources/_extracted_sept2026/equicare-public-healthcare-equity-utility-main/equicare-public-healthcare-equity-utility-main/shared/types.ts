export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number;
}
export interface PricePoint {
  label: string;
  value: number;
  description?: string;
}
export interface Facility {
  id: string;
  name: string;
  location: string;
  estimatedCost: number;
  transparencyRating: number; // 1-5
}
export interface Procedure {
  id: string;
  name: string;
  cptCode: string;
  fairPrice: number;
  avgPrice: number;
  marketRange: [number, number];
  description: string;
  category: string;
}
export type RiskLevel = 'LOW' | 'MED' | 'HIGH';
export type AuditStatus = 'PENDING' | 'AUDITED';
export interface Benchmark {
  id: string;
  cptCode: string;
  localityId: string;
  medicareRate: number;
  fmvMultiplier: number;
  payer?: string;
  medianAllowed?: number;
  p10?: number;
  p90?: number;
  varianceIndex?: number;
}
export interface TransparencyManifest {
  id: string;
  payer: string;
  s3Key: string;
  signature: string;
  publishedAt: number;
  procedureCount: number;
}
export interface Claim {
  id: string;
  tenantId: string;
  token: string;
  cpt: string;
  billedAmount: number;
  locality: string;
  status: AuditStatus;
  fmvResult?: number;
  riskLevel: RiskLevel;
  timestamp: number;
}
export interface ProviderRisk {
  id: string;
  tenantId: string;
  providerToken: string;
  zScore: number;
  riskCategory: RiskLevel;
}
export interface Embedding {
  id: string;
  sessionId: string;
  contextHash: string;
  vector: number[];
  metadata: Record<string, any>;
}
export interface AuditSummary {
  totalClaims: number;
  totalBilled: number;
  potentialSavings: number;
  riskDistribution: Record<RiskLevel, number>;
  activeTenants: number;
}
export interface Tenant {
  id: string;
  name: string;
  locality: string;
}
// Phase 4/5: PA Health Equity & Audit Appeals
export type AppealStatus = 'PENDING' | 'WON' | 'LOST';
export interface Appeal {
  id: string;
  tenantId: string;
  claimId: string;
  token: string;
  cpt: string;
  billedAmount: number;
  status: AppealStatus;
  timestamp: number;
  notes: string;
}
export interface ConsensusMapping {
  id: string;
  description: string;
  suggestedCpt: string;
  votes: number;
  verified: boolean;
}
export interface HospitalPerformance {
  id: string;
  name: string;
  locality: string;
  varianceIndex: number; // Percentage over FMV
  transparencyScore: number; // 1-100
  claimCount: number;
  rank: number;
}