import { Logger } from "./logger";
import { eobFormSchema, EobFormValues } from "./validationSchemas";
import { checkAllowedAmountResilience } from "./checkAllowedAmountResilience";
import { RATING_AREAS } from "@/data/ratingAreas";
export interface AuditResult {
  expectedPatientResp: number;
  actualPatientResp: number;
  balanceBilling: number;
  isPotentialError: boolean;
  isHighRisk: boolean;
  resilienceScore: number;
  benchmarkValue: number;
  isResilient: boolean;
  forensicNotes: string[];
  // Rehydration Fields
  forecasted2026Allowed?: number;
  activeMultiplier?: number;
  isForecastMode?: boolean;
}
/**
 * Calculates a multiplier based on approved increase percentage.
 * Example: 15.2% increase -> 1.152 multiplier
 */
export function calculateCarrierMultiplier(approvedIncrease: number): number {
  return 1 + (approvedIncrease / 100);
}
/**
 * Projects a 2025 cost into 2026 based on market intelligence.
 */
export function forecast2026Cost(
  historicalAllowed: number,
  ratingAreaId: string,
  carrierName?: string
): { forecasted: number; multiplier: number } {
  const area = RATING_AREAS.find(a => a.id === ratingAreaId);
  const STATEWIDE_BENCHMARK = 1.215; // 21.5%
  let multiplier = STATEWIDE_BENCHMARK;
  if (area) {
    const isExplicitCarrier = carrierName && carrierName !== "" && carrierName !== "none";
    if (isExplicitCarrier) {
      const carrier = area.carriers.find(c => c.name === carrierName);
      if (carrier) {
        multiplier = calculateCarrierMultiplier(carrier.approvedIncrease);
      }
    } else if (area.carriers.length > 0) {
      // Calculate Area Average instead of falling back to statewide
      const sum = area.carriers.reduce((s, c) => s + c.approvedIncrease, 0);
      const avgIncrease = sum / area.carriers.length;
      multiplier = calculateCarrierMultiplier(avgIncrease);
    }
  }
  return {
    forecasted: Number((historicalAllowed * multiplier).toFixed(2)),
    multiplier: Number(multiplier.toFixed(3))
  };
}
export function auditEob(
  billed: number,
  allowed: number,
  paid: number,
  coinsurance: number,
  procedureCode: string = "99213",
  ratingArea: string = "1",
  historicalAllowed?: number,
  carrierName?: string
): AuditResult {
  const expectedPatientResp = (allowed * coinsurance) / 100;
  const actualPatientResp = billed - paid;
  const balanceBilling = Math.max(0, actualPatientResp - expectedPatientResp);
  // Benchmark Check
  const resilience = checkAllowedAmountResilience(procedureCode, allowed, ratingArea);
  const isHighRisk = balanceBilling > (allowed * 0.5);
  const isPotentialError = balanceBilling > 10;
  const notes: string[] = [];
  if (balanceBilling > 0) {
    notes.push(`Detected ${balanceBilling.toFixed(2)} in potential balance billing.`);
  }
  if (isHighRisk) {
    notes.push("CRITICAL: Balance exceeds 50% of allowed amount. High probability of OON billing violation.");
  }
  if (billed > allowed * 3) {
    notes.push("WARNING: Provider charge ratio exceeds regional 3x benchmark.");
  }
  const benchmarkDiff = ((allowed / resilience.benchmarkValue) - 1) * 100;
  if (Math.abs(benchmarkDiff) > 1) {
    const direction = benchmarkDiff > 0 ? "above" : "below";
    notes.push(`Forensic Audit: Allowed amount is ${Math.abs(benchmarkDiff).toFixed(1)}% ${direction} regional benchmark.`);
  }
  let forecastData = {};
  if (historicalAllowed && historicalAllowed > 0) {
    const projection = forecast2026Cost(historicalAllowed, ratingArea, carrierName);
    forecastData = {
      forecasted2026Allowed: projection.forecasted,
      activeMultiplier: projection.multiplier,
      isForecastMode: true
    };
    notes.push(`Rehydration: 2026 projected allowed amount is ${projection.forecasted} (${(projection.multiplier * 100 - 100).toFixed(1)}% market shift).`);
  }
  return {
    expectedPatientResp: Number(expectedPatientResp.toFixed(2)),
    actualPatientResp: Number(actualPatientResp.toFixed(2)),
    balanceBilling: Number(balanceBilling.toFixed(2)),
    isPotentialError,
    isHighRisk,
    resilienceScore: resilience.resilienceScore,
    benchmarkValue: resilience.benchmarkValue,
    isResilient: resilience.isCompliant,
    forensicNotes: notes,
    ...forecastData
  };
}
export async function safeAuditEob(data: EobFormValues): Promise<AuditResult | null> {
  try {
    const validated = eobFormSchema.safeParse(data);
    if (!validated.success) return null;
    const { billed, allowed, paid, coinsurance, procedureCode, ratingArea, historicalAllowed, carrierName } = validated.data;
    return auditEob(billed, allowed, paid, coinsurance, procedureCode, ratingArea, historicalAllowed, carrierName);
  } catch (error) {
    Logger.error("EOB Audit failed", "EOB_CALC", error);
    return null;
  }
}