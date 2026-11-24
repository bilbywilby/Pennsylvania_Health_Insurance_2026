import CryptoJS from 'crypto-js';
export interface Statute {
  id: string;
  title: string;
  category: 'Minor Consent' | 'Financial Appeals' | 'Forensic Standards';
  text: string;
  citation: string;
}
export const CPT_GLOSSARY: Record<string, { label: string; description: string; typicalPrice: string; eli12: string }> = {
  "99213": {
    label: "Standard Office Visit (Low/Moderate)",
    description: "A routine check-up for existing patients with simple health concerns.",
    typicalPrice: "$125.00",
    eli12: "A quick talk with your doctor for something simple, like a sore throat."
  },
  "99214": {
    label: "Extended Office Visit (Moderate)",
    description: "A more detailed visit for chronic issues or multiple health concerns.",
    typicalPrice: "$185.50",
    eli12: "A longer talk where the doctor checks a few different problems or one big one."
  },
  "99215": {
    label: "Comprehensive Office Visit (High)",
    description: "An intensive visit for complex, severe, or high-risk medical problems.",
    typicalPrice: "$255.00",
    eli12: "A very serious meeting for complicated health issues that take a lot of time."
  },
  "45378": {
    label: "Colonoscopy (Diagnostic)",
    description: "A screening procedure to examine the large intestine.",
    typicalPrice: "$850.00",
    eli12: "A camera check to make sure your tummy and pipes are healthy inside."
  },
  "70450": {
    label: "CT Scan (Head/Brain)",
    description: "An imaging test that uses X-rays to create detailed pictures of the brain.",
    typicalPrice: "$420.00",
    eli12: "A special 3D photo of your head to see if everything is okay inside your skull."
  },
  "90834": {
    label: "Therapy Session (45 Minutes)",
    description: "A standard individual psychotherapy session with a mental health professional.",
    typicalPrice: "$145.00",
    eli12: "A safe time to talk to a feelings-doctor about how you are doing."
  },
};
export const COUNTY_DATA: Record<string, { ratingArea: string; primaryCarrier: string; stability: number }> = {
  "Allegheny": { ratingArea: "Area 4", primaryCarrier: "UPMC Health", stability: 92 },
  "Philadelphia": { ratingArea: "Area 1", primaryCarrier: "Independence", stability: 85 },
  "Dauphin": { ratingArea: "Area 3", primaryCarrier: "Highmark Blue", stability: 78 },
  "Erie": { ratingArea: "Area 5", primaryCarrier: "Highmark Blue", stability: 88 },
  "Lackawanna": { ratingArea: "Area 6", primaryCarrier: "Geisinger", stability: 91 },
};
export const PA_2026_MARKET_DATA: Record<string, { fmv: number; carrier: string }> = {
  "99213": { fmv: 12500, carrier: "Highmark Blue" },
  "99214": { fmv: 18550, carrier: "UPMC Health" },
  "99215": { fmv: 25500, carrier: "Highmark Blue" },
  "45378": { fmv: 85000, carrier: "Geisinger" },
  "70450": { fmv: 42000, carrier: "Independence" },
  "90834": { fmv: 14500, carrier: "Aetna PA" },
};
export const PA_STATUTES: Statute[] = [
  {
    id: "PA-35-10101",
    title: "Minors' Consent to Medical Care",
    category: "Minor Consent",
    citation: "35 P.S. § 10101",
    text: "Any minor who is eighteen years of age or older, or has graduated from high school, or has married, or has been pregnant, may give effective consent to medical, dental and health services."
  },
  {
    id: "PA-40-991",
    title: "Internal Grievance Process",
    category: "Financial Appeals",
    citation: "40 P.S. § 991.2141",
    text: "Enrollees have the right to an internal grievance process for any adverse benefit determination, including medical necessity denials and pricing disputes."
  },
  {
    id: "PA-FRN-2026",
    title: "Forensic Audit Integrity Standards",
    category: "Forensic Standards",
    citation: "Admin Code § 42.105",
    text: "All third-party healthcare audits must utilize cryptographically verifiable logs when handling PII-redacted datasets for legal proceedings."
  }
];
export function parseToCents(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }
  if (!input || typeof input !== 'string') return 0;
  // Remove currency symbols and commas (e.g., "$1,200.50" -> "1200.50")
  const clean = input.replace(/[$,]/g, '').trim();
  const val = parseFloat(clean);
  if (isNaN(val)) return 0;
  // Consistently return rounded cents
  return Math.round(val * 100);
}
export function scrubPII(text: string): string {
  if (!text) return "";
  let scrubbed = text;
  scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED SSN]");
  scrubbed = scrubbed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED EMAIL]");
  scrubbed = scrubbed.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "[REDACTED DOB]");
  scrubbed = scrubbed.replace(/\b(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, "[REDACTED PHONE]");
  return scrubbed;
}
export function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = canonicalize(obj[key]);
  }
  return result;
}
export function generateHash(data: any): string {
  const canonicalString = JSON.stringify(canonicalize(data));
  return CryptoJS.SHA256(canonicalString).toString(CryptoJS.enc.Hex);
}
export function calculateVariance(billedCents: number, targetCents: number): {
  diff: number;
  percent: number;
  status: 'critical' | 'warning' | 'nominal';
} {
  const safeBilled = billedCents || 0;
  const safeTarget = targetCents || 1;
  const diff = safeBilled - safeTarget;
  const percent = (diff / safeTarget) * 100;
  let status: 'critical' | 'warning' | 'nominal' = 'nominal';
  if (percent > 150) status = 'critical';
  else if (percent > 20) status = 'warning';
  return { diff, percent, status };
}
export function generateSmartNarrative(record: any, isExpertMode: boolean): { text: string; action: string } {
  const { variance, cptCode } = record;
  const glossary = CPT_GLOSSARY[cptCode] || { label: "unknown visit", eli12: "a doctor visit" };
  if (!isExpertMode) {
    if (variance.status === 'critical') {
      return {
        text: `Whoa! You were billed way more than usual for ${glossary.eli12}. This looks like "Upcoding," which means the doctor wrote down a more expensive visit than what actually happened.`,
        action: "Ask your doctor's office for a 'Detailed Bill' and check if the visit was really that complicated."
      };
    }
    return {
      text: `Good news! Your bill for ${glossary.eli12} matches what we usually see in your area.`,
      action: "Keep this record in case your insurance company tries to change the price later."
    };
  }
  return {
    text: `Analysis detects a ${variance.percent.toFixed(1)}% variance for CPT ${cptCode}. This exceeds regional Fair Market Value by ${(variance.diff/100).toFixed(2)}.`,
    action: "Initiate Internal Grievance under PA-40-991 citing regional baseline deviation."
  };
}
export function getPrediction(volatility: number): string {
  if (volatility > 9) return "Market volatility is very high. Expect carrier premiums to increase significantly next cycle.";
  if (volatility > 7) return "Prices are shifting upward. Watch for network changes in the coming months.";
  return "Market prices are stable. No major fluctuations expected in the near term.";
}
export function getFriendlyLabel(term: string): string {
  const map: Record<string, string> = {
    'variance': 'Difference from normal price',
    'sealed': 'Tamper-proof review',
    'volatility': 'Market price fluctuations',
    'cpt': 'Medical service type',
    'fmv': 'Regional fair price',
    'pos': 'Where care was received'
  };
  return map[term.toLowerCase()] || term;
}
export function getSeverityColor(status: 'critical' | 'warning' | 'nominal'): string {
  switch (status) {
    case 'critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'nominal': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  }
}