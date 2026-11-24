/**
 * Benchmark utility for PA Market Resilience
 */
const PA_BENCHMARKS: Record<string, number> = {
  "99213": 125, // Level 3 Office Visit
  "99214": 185, // Level 4 Office Visit
  "45378": 850, // Diagnostic Colonoscopy
  "70450": 320, // CT Head/Brain
  "74177": 550, // CT Abdomen/Pelvis w/ contrast
};
export interface ResilienceReport {
  isCompliant: boolean;
  suggestedMax: number;
  resilienceScore: number;
  benchmarkValue: number;
}
export function checkAllowedAmountResilience(procedureCode: string, allowedAmount: number, ratingArea: string): ResilienceReport {
  const benchmark = PA_BENCHMARKS[procedureCode] || 150;
  // Regional adjustment: RA8 (Philly) has higher overhead (+15%)
  const adjustedBenchmark = ratingArea === "8" ? benchmark * 1.15 : benchmark;
  const ratio = allowedAmount / adjustedBenchmark;
  const score = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return {
    isCompliant: ratio >= 0.85,
    suggestedMax: adjustedBenchmark,
    resilienceScore: score,
    benchmarkValue: adjustedBenchmark
  };
}