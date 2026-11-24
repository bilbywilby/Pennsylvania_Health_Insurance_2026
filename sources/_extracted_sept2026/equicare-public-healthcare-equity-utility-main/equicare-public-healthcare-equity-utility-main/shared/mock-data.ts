import type { User, Chat, ChatMessage, Procedure, Benchmark, Claim, Tenant, Appeal, ConsensusMapping, HospitalPerformance, TransparencyManifest } from './types';
export const MOCK_USERS: User[] = [{ id: 'u1', name: 'Admin User' }];
export const MOCK_CHATS: Chat[] = [{ id: 'c1', title: 'System Logs' }];
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [];
export const MOCK_PROCEDURES: Procedure[] = [
  {
    id: 'p1', name: 'MRI Lumbar Spine (without contrast)', cptCode: '72141', fairPrice: 450, avgPrice: 1200,
    marketRange: [350, 2800], description: 'Non-invasive imaging test.', category: 'Imaging'
  }
];
export const MOCK_TENANTS: Tenant[] = [
  { id: 't1', name: 'Northwell Health Group', locality: 'PA01' },
  { id: 't2', name: 'Metro Benefits Admin', locality: 'PA02' },
  { id: 't3', name: 'EquiAudit Consultants', locality: 'PA01' }
];
export const MOCK_BENCHMARKS: Benchmark[] = [
  { id: 'bm:99214:PA01', cptCode: '99214', localityId: 'PA01', medicareRate: 128.50, fmvMultiplier: 1.4, payer: 'Highmark', medianAllowed: 180, p10: 140, p90: 220 },
  { id: 'bm:72141:PA01', cptCode: '72141', localityId: 'PA01', medicareRate: 380.00, fmvMultiplier: 1.2, payer: 'UPMC Health', medianAllowed: 450, p10: 380, p90: 600 },
  { id: 'bm:45378:PA01', cptCode: '45378', localityId: 'PA01', medicareRate: 650.00, fmvMultiplier: 1.5, payer: 'IBC', medianAllowed: 975, p10: 800, p90: 1200 }
];
export const MOCK_CLAIMS: Claim[] = [
  {
    id: 'cl1', tenantId: 't1', token: 'a8f23c91e2b1', cpt: '99214', billedAmount: 350.00, locality: 'PA01',
    status: 'AUDITED', fmvResult: 179.90, riskLevel: 'MED', timestamp: Date.now() - 86400000
  },
  {
    id: 'cl2', tenantId: 't1', token: 'b45d912c3f81', cpt: '72141', billedAmount: 1800.00, locality: 'PA01',
    status: 'AUDITED', fmvResult: 456.00, riskLevel: 'HIGH', timestamp: Date.now() - 172800000
  }
];
export const MOCK_APPEALS: Appeal[] = [
  {
    id: 'ap1', tenantId: 't1', claimId: 'cl2', token: 'b45d912c3f81', cpt: '72141',
    billedAmount: 1800, status: 'PENDING', timestamp: Date.now() - 432000000, notes: 'Dispute high variance based on local provider contract overrides.'
  }
];
export const MOCK_CONSENSUS: ConsensusMapping[] = [
  { id: 'cns1', description: 'Complex Spinal Imaging - Outpatient', suggestedCpt: '72141', votes: 42, verified: true },
  { id: 'cns2', description: 'Routine Physician Follow-up (15 min)', suggestedCpt: '99214', votes: 128, verified: true },
  { id: 'cns3', description: 'Advanced Diagnostic Colonoscopy', suggestedCpt: '45378', votes: 15, verified: false }
];
export const MOCK_HOSPITALS: HospitalPerformance[] = [
  { id: 'h1', name: 'UPMC Presbyterian', locality: 'PA01', varianceIndex: 12, transparencyScore: 94, claimCount: 15400, rank: 1 },
  { id: 'h2', name: 'Temple Health', locality: 'PA01', varianceIndex: 25, transparencyScore: 82, claimCount: 8900, rank: 2 },
  { id: 'h3', name: 'Jefferson Health', locality: 'PA01', varianceIndex: 42, transparencyScore: 78, claimCount: 12300, rank: 3 }
];
export const MOCK_MANIFESTS: TransparencyManifest[] = [
  { id: 'man1', payer: 'Highmark', s3Key: 'mrf/highmark-2026-01.json', signature: 'hmac-8f3e2...', publishedAt: Date.now() - 86400000, procedureCount: 4500 }
];