/**
 * Forensic Subsidy Impact Engine for 2026 Cliff Modeling
 */
export interface NetPremiumImpact {
  netPremium: number;
  cliffRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  isAboveCliff: boolean;
  estimatedSaving: number;
}
const CLIFF_THRESHOLD = 60240; // 400% FPL for Individual in 2026 (approx)
const ARPA_CAP_RATE = 0.085;
export function calculateNetPremiumImpact(grossPremium: number, income: number): NetPremiumImpact {
  const isAboveCliff = income > CLIFF_THRESHOLD;
  const annualIncomeLimit = income * ARPA_CAP_RATE;
  const monthlyCappedPremium = annualIncomeLimit / 12;
  let netPremium: number;
  let cliffRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  let estimatedSaving: number;
  if (isAboveCliff) {
    // Post-ARPA Fallback: Households pay full market rate or a significantly reduced subsidy
    // Model assumes 0 subsidy for conservative forensic auditing above the cliff
    netPremium = grossPremium;
    cliffRisk = 'Critical';
    estimatedSaving = 0;
  } else {
    // ARPA Active: Premium is capped at 8.5% of income
    netPremium = Math.min(grossPremium, monthlyCappedPremium);
    estimatedSaving = Math.max(0, grossPremium - monthlyCappedPremium);
    // Risk assessment based on proximity to cliff
    const proximity = income / CLIFF_THRESHOLD;
    if (proximity > 0.95) cliffRisk = 'High';
    else if (proximity > 0.80) cliffRisk = 'Moderate';
    else cliffRisk = 'Low';
  }
  return {
    netPremium: Number(netPremium.toFixed(2)),
    cliffRisk,
    isAboveCliff,
    estimatedSaving: Number(estimatedSaving.toFixed(2))
  };
}