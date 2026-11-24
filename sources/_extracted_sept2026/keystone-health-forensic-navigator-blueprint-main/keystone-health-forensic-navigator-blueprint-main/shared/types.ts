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
export interface ForensicRecord {
  id: string;
  cptCode: string;
  billedCents: number;
  allowedCents?: number;
  providerSpecialty?: string;
  placeOfService?: 'Office' | 'Inpatient' | 'Outpatient' | 'ER';
  narrative: string;
  timestamp: string;
  recordHash: string;
  marketBaseline: {
    fmv: number;
    carrier: string;
  };
  variance: {
    diff: number;
    percent: number;
    status: 'critical' | 'warning' | 'nominal';
  };
}
export interface CarrierTrendPoint {
  timestamp: string;
  highmark: number;
  upmc: number;
  geisinger: number;
  marketAvg: number;
}
export type VolatilityClass = 'Elevated' | 'Nominal' | 'Critical';
export interface DashboardStats {
  totalVarianceCents: number;
  sealedAuditCount: number;
  marketVolatilityIndex: number;
  volatilityClass: VolatilityClass;
  riskScore: number;
  marketNarrative: string;
  multiCarrierTrends: CarrierTrendPoint[];
  recentRecords: ForensicRecord[];
}
export interface ChainIntegrity {
  hash: string;
  depth: number;
  verified: boolean;
  timestamp: string;
}