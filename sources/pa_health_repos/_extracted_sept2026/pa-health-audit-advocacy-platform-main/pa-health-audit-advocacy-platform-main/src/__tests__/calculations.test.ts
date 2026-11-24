import { describe, it, expect } from 'vitest';
import { SubsidyCalculator } from '../lib/calculations';
import { auditEob } from '../lib/eobCalculations';
describe('SubsidyCalculator', () => {
  it('correctly calculates FPL for a household of 1', () => {
    // 2026 Base is 15060. 30120 should be 200%.
    const fpl = SubsidyCalculator.calculateFPL(30120, 1);
    expect(Math.round(fpl)).toBe(200);
  });
  it('correctly calculates FPL for a household of 2', () => {
    // 2026 Base 15060 + 5380 = 20440. 20440 should be 100%.
    const fpl = SubsidyCalculator.calculateFPL(20440, 2);
    expect(Math.round(fpl)).toBe(100);
  });
  it('detects the 400% FPL Cliff', () => {
    // Household of 1, 401% FPL
    const income = 15060 * 4.01;
    const result = SubsidyCalculator.estimateSubsidy(income, 1);
    expect(result.status).toBe('Cliff');
    expect(result.eligibility).toBe('None');
    expect(result.warning).toContain('CRITICAL');
  });
  it('applies ARPA caps for 150% FPL', () => {
    const income = 15060 * 1.5;
    const result = SubsidyCalculator.estimateSubsidy(income, 1, 500);
    expect(result.cappedPremium).toBe(0);
    expect(result.monthlySubsidy).toBe(500);
    expect(result.eligibility).toBe('Full');
  });
});
describe('EOB Audit Logic', () => {
  it('detects balance billing errors', () => {
    const billed = 1000;
    const allowed = 500;
    const paid = 300;
    const coinsurance = 20; // Expected copay is 20% of 500 = 100
    const result = auditEob(billed, allowed, paid, coinsurance);
    // actualPatientResp = 1000 - 300 = 700
    // expectedPatientResp = 100
    // balanceBilling = 600
    expect(result.balanceBilling).toBe(600);
    expect(result.isHighRisk).toBe(true);
    expect(result.forensicNotes).toContain("CRITICAL: Balance exceeds 50% of allowed amount. High probability of OON billing violation.");
  });
  it('validates clean claims', () => {
    const billed = 500;
    const allowed = 500;
    const paid = 400;
    const coinsurance = 20;
    const result = auditEob(billed, allowed, paid, coinsurance);
    expect(result.balanceBilling).toBe(0);
    expect(result.isPotentialError).toBe(false);
  });
});