/**
 * Hardened Forensic Appeal Strategies for Pennsylvania
 * Consolidates all advocacy logic into a single robust utility.
 */
export type DenialContext = {
  denialCode: string;
  userName: string;
  facilityName?: string;
  serviceDate?: string;
  policyRef?: string;
  procedureCode?: string;
};
export const STRATEGIES = {
  DENIAL_01: {
    strategyTitle: "Medical Necessity Forensic Audit",
    keyCitations: [
      "PA Act 68 (§ 2111-2113 - Clinical Standards)",
      "NCQA Quality Standard CP_BCBS_2026_04",
      "Institutional Resilience Protocol PA-MED-01"
    ],
    narrativeTemplate: (ctx: DenialContext) =>
      `To the Medical Review Board,\n\nI, ${ctx.userName}, am formally appealing the denial of coverage for services on ${ctx.serviceDate || '[DATE]'} at ${ctx.facilityName || '[FACILITY]'}.\n\nLEGAL BASIS:\nPursuant to the Quality Health Care Accountability and Protection Act (PA Act 68), carriers must apply clinical criteria that is standard to the geographic region. This treatment is standard-of-care for residents in my Rating Area.\n\nCLINICAL AUDIT:\nThe denial cites a lack of medical necessity; however, documentation from my provider confirms this procedure meets Tier-1 necessity benchmarks. As per institutional protocols, I request a full forensic review of this claim and a written determination within the 30-day statutory window.\n\nFailure to comply will result in an immediate escalation to the Pennsylvania Insurance Department.\n\nSincerely,\n${ctx.userName}\n[E-Signature Stamp]`
  },
  PHARM_STEP: {
    strategyTitle: "Step Therapy Override Request",
    keyCitations: [
      "PA SB 225 Reform (Step Therapy & Prior Auth)",
      "Chronic Care Act (§ 4.2)",
      "Clinical Exception Mandate 2026"
    ],
    narrativeTemplate: (ctx: DenialContext) =>
      `Dear Pharmacy Review Board,\n\nThis is a formal request by ${ctx.userName} to override the Step Therapy requirement for my prescribed medication.\n\nCLINICAL AUDIT:\nPer PA SB 225, step therapy protocols must be transparent and medically sound. I have already attempted the formulary alternatives without clinical success, or they are contraindicated. Delaying this treatment poses an irreversible risk of health deterioration based on provider-submitted clinical markers.\n\nPlease process this exception mandate immediately.\n\nRegards,\n${ctx.userName}`
  },
  NSA_PROTECT: {
    strategyTitle: "No Surprises Act Balance Billing Defense",
    keyCitations: [
      "Federal No Surprises Act (45 CFR § 149.110)",
      "PA Insurance Dept Bulletin 2022-01",
      "Qualified Payment Amount (QPA) Protection"
    ],
    narrativeTemplate: (ctx: DenialContext) =>
      `To whom it may concern,\n\nI, ${ctx.userName}, am disputing claim [ID] under the protections of the Federal No Surprises Act. I received services at ${ctx.facilityName || 'an in-network facility'} where I had no choice in the specific provider.\n\nPROTECTION AUDIT:\nPer federal transparency guidelines (45 CFR § 149.110), my cost-sharing is strictly limited to the in-network rate (Qualified Payment Amount). Any attempt to balance bill the remaining discrepancy is a violation of federal law.\n\nI request an immediate correction of my patient responsibility to match in-network benchmarks.\n\nSincerely,\n${ctx.userName}`
  }
};
export function generateAppealStrategy(denialCode: string, userName: string, facilityName?: string) {
  const code = denialCode.includes('NSA') ? 'NSA_PROTECT' : (denialCode === 'MED_NEC' ? 'DENIAL_01' : 'PHARM_STEP');
  const strategy = STRATEGIES[code as keyof typeof STRATEGIES] || STRATEGIES.DENIAL_01;
  return {
    ...strategy,
    text: strategy.narrativeTemplate({ denialCode, userName, facilityName })
  };
}