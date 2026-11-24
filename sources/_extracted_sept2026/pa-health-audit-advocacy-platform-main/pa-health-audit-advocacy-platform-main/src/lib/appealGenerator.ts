/**
 * Hardened Appeal Logic for Phase 15
 */
export interface AppealParams {
  userName: string;
  facilityName?: string;
  denialCode: string;
  serviceDate?: string;
  procedureCode?: string;
}
export function generateHardenedAppeal(params: AppealParams): string {
  const date = params.serviceDate || new Date().toLocaleDateString();
  const facility = params.facilityName || "[Provider/Facility]";
  // Hardened clinical references based on 2026 PA marketplace
  const policyRef = params.denialCode === 'MED_NEC' ? 'CP_BCBS_2026_04' : 'CP_NSA_FED_01';
  let regulationSection = "";
  let argumentSection = "";
  if (params.denialCode === 'MED_NEC') {
    regulationSection = "PA Act 68 (§ 2111-2113 - Clinical Standards)";
    argumentSection = `The denial cites clinical guideline ${policyRef}. However, pursuant to the Quality Health Care Accountability and Protection Act, carriers must apply clinical criteria that is standard to the geographic region. documentation from my provider confirms this procedure meets Tier-1 necessity benchmarks for Rating Area residents.`;
  } else if (params.denialCode === 'NSA') {
    regulationSection = "Federal No Surprises Act (45 CFR § 149.110)";
    argumentSection = `I received services at ${facility}, a qualified in-network facility. Per federal transparency guidelines, I am protected from balance billing for ancillary services provided by out-of-network clinicians at this location. Any cost-sharing must be based on the Qualified Payment Amount (QPA).`;
  } else {
    regulationSection = "PA SB 225 (Step Therapy & Prior Auth Reform)";
    argumentSection = "The proposed step therapy requirement violates the clinical exception mandate. Delaying access to this specific medication poses an irreversible risk of health deterioration according to my provider's clinical assessment.";
  }
  return `
[FORMAL NOTICE OF APPEAL]
DATE: ${new Date().toLocaleDateString()}
TO: Medical Review Board / Appeals Department
RE: COVERAGE DENIAL - ${params.denialCode}
REF POLICY: ${policyRef}
To the Appeals Director,
I, ${params.userName}, am formally filing a grievance against the coverage denial for services at ${facility} on ${date}. 
LEGAL BASIS:
This appeal is submitted under ${regulationSection}, which mandates fair clinical adjudication for Pennsylvania residents.
CLINICAL AUDIT:
${argumentSection}
As per the institutional resilience protocols, I request a full forensic review of this claim and a written determination within the 30-day statutory window. Failure to comply will result in an immediate escalation to the Pennsylvania Insurance Department.
Sincerely,
${params.userName}
[E-Signature Stamp]
`.trim();
}