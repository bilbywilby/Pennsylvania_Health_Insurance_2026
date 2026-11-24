export type TemplateType = 'REGIONAL_ACCESS' | 'MEDICAL_NECESSITY' | 'PROVIDER_NETWORK' | 'STEP_THERAPY';
export const ADVOCACY_TEMPLATES = {
  REGIONAL_ACCESS: {
    title: "Regional Access Grievance",
    strength: "High",
    citations: ["PA Act 68 �� 2111", "Section 1557 ACA"],
    description: "Focuses on Rating Area specific network adequacy and geographic barriers.",
  },
  MEDICAL_NECESSITY: {
    title: "Clinical Standards Appeal",
    strength: "Critical",
    citations: ["PA Act 68 § 2112", "Clinical Exception Mandate 2026"],
    description: "Challenges denials based on external clinical benchmarks and Tier-1 standards.",
  },
  PROVIDER_NETWORK: {
    title: "Network Continuity Request",
    strength: "Moderate",
    citations: ["NSA 45 CFR § 149", "PA SB 225 Reform"],
    description: "Defends against balance billing and unauthorized out-of-network shifts.",
  },
  STEP_THERAPY: {
    title: "Pharmaceutical Exception",
    strength: "High",
    citations: ["PA SB 225 (Step Therapy Reform)", "Chronic Care Act § 4.2"],
    description: "Requests immediate override for prescribed medications under new 2026 reforms.",
  }
} as const;