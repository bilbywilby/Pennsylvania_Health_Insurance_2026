import { AuditResult } from './eobCalculations';
import { SubsidyResult } from './calculations';
export interface PdfBlock {
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  italic?: boolean;
  color?: [number, number, number];
  maxWidth?: number;
  lineHeight?: number;
}
export interface ReportJSON {
  metadata: {
    title: string;
    author: string;
    subject: string;
    reportId: string;
    timestamp: string;
  };
  blocks: PdfBlock[];
  formFields?: Array<{
    name: string;
    value: string;
    x: number;
    y: number;
  }>;
}
export interface AuditState {
  income: number;
  household: number;
  lastSubsidyResult: SubsidyResult | null;
  lastEobResult: AuditResult | null;
  appealDraft: string;
  timestamp: string;
  tempSignature?: string; // Data URL for session-based signature persistence
}
export interface AuditContextType {
  state: AuditState;
  updateState: (updates: Partial<AuditState>) => void;
  resetState: () => void;
}
export const DEFAULT_STATE: AuditState = {
  income: 45000,
  household: 1,
  lastSubsidyResult: null,
  lastEobResult: null,
  appealDraft: "",
  timestamp: new Date().toISOString(),
};