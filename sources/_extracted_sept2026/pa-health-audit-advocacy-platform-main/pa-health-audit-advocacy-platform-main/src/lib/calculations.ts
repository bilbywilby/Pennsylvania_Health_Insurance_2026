import { Logger } from "./logger";
import { subsidyFormSchema } from "./validationSchemas";
export const FPL_2026_BASE = 15060;
export const FPL_2026_STEP = 5380;
export interface SubsidyResult {
  fplPercentage: number;
  monthlySubsidy: number;
  marketPremium: number;
  cappedPremium: number;
  eligibility: 'Full' | 'Partial' | 'None';
  status: 'Safe' | 'Warning' | 'Cliff';
  impact: string;
  warning: string;
}
export class SubsidyCalculator {
  static calculateFPL(income: number, householdSize: number): number {
    if (householdSize < 1) {
      Logger.error("Invalid household size detected", "SubsidyCalculator");
      return 0;
    }
    const base = FPL_2026_BASE + (householdSize - 1) * FPL_2026_STEP;
    return (income / base) * 100;
  }
  static estimateSubsidy(income: number, householdSize: number, benchmarkPremium: number = 550): SubsidyResult {
    const fplPercent = this.calculateFPL(income, householdSize);
    // 12% Market Baseline vs 8.5% ARPA caps
    const marketPremium = benchmarkPremium; 
    let maxContributionPercent = 0;
    let eligibility: 'Full' | 'Partial' | 'None' = 'None';
    if (fplPercent <= 150) {
      maxContributionPercent = 0;
      eligibility = 'Full';
    } else if (fplPercent <= 200) {
      maxContributionPercent = 2;
      eligibility = 'Partial';
    } else if (fplPercent <= 250) {
      maxContributionPercent = 4;
      eligibility = 'Partial';
    } else if (fplPercent <= 300) {
      maxContributionPercent = 6;
      eligibility = 'Partial';
    } else if (fplPercent <= 400) {
      maxContributionPercent = 8.5;
      eligibility = 'Partial';
    } else {
      maxContributionPercent = 12; // Market Baseline (Post-ARPA/Cliff)
      eligibility = 'None';
    }
    const maxAnnualContribution = (income * maxContributionPercent) / 100;
    const cappedPremium = Number((maxAnnualContribution / 12).toFixed(2));
    const monthlySubsidy = Math.max(0, marketPremium - cappedPremium);
    let status: 'Safe' | 'Warning' | 'Cliff' = 'Safe';
    let impact = "Standard ACA subsidies apply.";
    let warning = "No immediate cliff risk detected.";
    if (fplPercent > 400) {
      status = 'Cliff';
      impact = "100% loss of ARPA premium caps.";
      warning = "CRITICAL: Household exceeds 400% FPL. Net premium jump of 102%+ projected for 2026.";
    } else if (fplPercent > 350) {
      status = 'Warning';
      impact = "High sensitivity to income fluctuations.";
      warning = "CAUTION: Near the 400% FPL threshold. Small income increases may trigger the 2026 cliff.";
    }
    return {
      fplPercentage: Number(fplPercent.toFixed(2)),
      monthlySubsidy: Number(monthlySubsidy.toFixed(2)),
      marketPremium,
      cappedPremium,
      eligibility,
      status,
      impact,
      warning
    };
  }
  static async safeCalculateSubsidy(income: number, householdSize: number): Promise<SubsidyResult | null> {
    try {
      const validated = subsidyFormSchema.safeParse({ income, household: householdSize });
      if (!validated.success) {
        Logger.warn("Subsidy validation failed", "SubsidyCalculator");
        return null;
      }
      return this.estimateSubsidy(income, householdSize);
    } catch (error) {
      Logger.error("Failed to calculate subsidy", "SubsidyCalculator", error);
      return null;
    }
  }
}
export function auditClaim(billedAmt: number, allowedAmt: number, paidAmt: number, coinsurancePercent: number) {
  const expectedPatientResp = (allowedAmt * coinsurancePercent) / 100;
  const actualPatientResp = billedAmt - paidAmt;
  const balanceBilling = actualPatientResp - expectedPatientResp;
  return {
    expectedPatientResp,
    actualPatientResp,
    balanceBilling: balanceBilling > 1 ? balanceBilling : 0,
    isPotentialError: balanceBilling > 10,
  };
}