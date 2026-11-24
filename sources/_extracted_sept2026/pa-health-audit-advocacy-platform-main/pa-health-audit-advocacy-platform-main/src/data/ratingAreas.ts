export interface CarrierRate {
  name: string;
  planType: 'HMO' | 'PPO' | 'EPO' | 'POS';
  approvedIncrease: number;
  marketShare: string;
}
export interface StrategicProtocol {
  title: string;
  action: string;
}
export interface RatingAreaData {
  id: string;
  name: string;
  outlook2026: string;
  volatilityScore: number;
  carriers: CarrierRate[];
  protocols: StrategicProtocol[];
  counties: string[];
  regionalInsights: string[];
  isExpansion?: boolean;
}
export const RATING_AREAS: RatingAreaData[] = [
  {
    id: "1",
    name: "Rating Area 1 (Pittsburgh/Western PA)",
    outlook2026: "Expect significant consolidation. Highmark and UPMC continue to dominate, but rate parity is shifting.",
    volatilityScore: 7,
    counties: ["Allegheny", "Beaver", "Fayette", "Greene", "Washington", "Westmoreland"],
    regionalInsights: [
      "Specialty drug costs are driving a projected 12% premium baseline increase.",
      "Provider alignment between UPMC and Highmark facilities is narrowing.",
      "HSA-compatible Silver plans are showing highest efficiency for 2026."
    ],
    carriers: [
      { name: "Highmark BCBS", planType: "PPO", approvedIncrease: 11.5, marketShare: "45%" },
      { name: "UPMC Health Plan", planType: "HMO", approvedIncrease: 10.2, marketShare: "40%" },
      { name: "Aetna/CVS", planType: "PPO", approvedIncrease: 14.0, marketShare: "10%" },
    ],
    protocols: [
      { title: "Network Divergence", action: "Verify provider alignment between UPMC and Highmark facilities." },
      { title: "Subsidy Optimization", action: "Utilization of Silver plans for 400% FPL households." }
    ]
  },
  {
    id: "2",
    name: "Rating Area 2 (Northwest PA)",
    outlook2026: "Defined by a network split triggering massive cost-sharing risks.",
    volatilityScore: 8,
    counties: ["Butler", "Crawford", "Forest", "Lawrence", "Mercer", "Venango"],
    regionalInsights: [
      "Rural access challenges driving localized volatility.",
      "Highmark maintains 40% market dominance.",
      "Ambetter outlier increase of 37.8% detected."
    ],
    carriers: [
      { name: "Geisinger Health Plan", planType: "HMO", approvedIncrease: 11.6, marketShare: "25%" },
      { name: "Highmark", planType: "PPO", approvedIncrease: 18.4, marketShare: "40%" },
      { name: "Ambetter (Centene)", planType: "EPO", approvedIncrease: 37.8, marketShare: "15%" },
    ],
    protocols: [
      { title: "Cross-County Network", action: "Verify specialist alignment in Pittsburgh for Butler residents." }
    ]
  },
  {
    id: "3",
    name: "Rating Area 3 (Central PA/Harrisburg)",
    outlook2026: "Significant outlier: projected decrease in benchmark premiums.",
    volatilityScore: 4,
    counties: ["Adams", "Berks", "Cumberland", "Dauphin", "Franklin", "Lancaster", "Lebanon", "Lehigh", "Northampton", "Perry", "York"],
    regionalInsights: [
      "Capital Blue Cross expansion providing downward price pressure.",
      "Benchmark optimization allows for zero-cost Gold upgrades.",
      "Region demonstrates highest market stability for 2026."
    ],
    carriers: [
      { name: "Capital Blue Cross", planType: "PPO", approvedIncrease: -10.1, marketShare: "50%" },
      { name: "Geisinger", planType: "HMO", approvedIncrease: 4.2, marketShare: "30%" },
      { name: "Highmark", planType: "PPO", approvedIncrease: 8.5, marketShare: "15%" },
    ],
    protocols: [
      { title: "Benchmark Optimization", action: "Re-evaluate plans to upgrade to Gold tier." }
    ]
  },
  {
    id: "4",
    name: "Rating Area 4 (North Central)",
    outlook2026: "Geisinger dominance remains unchallenged but rural network narrowing is observed.",
    volatilityScore: 6,
    counties: ["Cameron", "Centre", "Clearfield", "Clinton", "Elk", "Jefferson", "Lycoming", "McKean", "Potter", "Tioga"],
    regionalInsights: [
      "Geisinger integration with Risant Health is shifting PPO benchmarks.",
      "Limited choice in Bronze tiers for 2026."
    ],
    carriers: [
      { name: "Geisinger Health", planType: "HMO", approvedIncrease: 9.8, marketShare: "65%" },
      { name: "Highmark", planType: "PPO", approvedIncrease: 12.4, marketShare: "25%" },
      { name: "Aetna", planType: "PPO", approvedIncrease: 15.2, marketShare: "10%" }
    ],
    protocols: [
      { title: "Provider Monopsony", action: "Verify Geisinger facility access for OON Highmark plans." },
      { title: "Travel Audit", action: "Evaluate distance to tertiary care centers for high-risk patients." }
    ]
  },
  {
    id: "5",
    name: "Rating Area 5 (North East/Scranton)",
    outlook2026: "Scranton/Wilkes-Barre markets showing high carrier churn.",
    volatilityScore: 7,
    counties: ["Carbon", "Lackawanna", "Luzerne", "Monroe", "Pike", "Susquehanna", "Wayne", "Wyoming"],
    regionalInsights: [
      "Highmark vs Geisinger rivalry causing zip-code level price variances.",
      "Ambetter entry providing low-cost but narrow-network alternatives."
    ],
    carriers: [
      { name: "Highmark BC", planType: "PPO", approvedIncrease: 14.2, marketShare: "40%" },
      { name: "Geisinger", planType: "HMO", approvedIncrease: 10.5, marketShare: "35%" },
      { name: "Ambetter", planType: "EPO", approvedIncrease: 8.9, marketShare: "15%" }
    ],
    protocols: [
      { title: "Network Stability", action: "Monitor Geisinger/Highmark contract status for local hospitals." }
    ]
  },
  {
    id: "6",
    name: "Rating Area 6 (Lehigh Valley)",
    outlook2026: "Extreme volatility due to high-density carrier competition.",
    volatilityScore: 10,
    counties: ["Lehigh", "Northampton"],
    regionalInsights: [
      "St. Luke's vs. LVHN alignment is zip-code sensitive.",
      "Highest risk of Subsidy Cliff impacts for 55-64 age bracket.",
      "Carrier churn rate expected to exceed 20% in 2026."
    ],
    carriers: [
      { name: "Capital Blue Cross", planType: "PPO", approvedIncrease: 24.6, marketShare: "45%" },
      { name: "Independence BC", planType: "PPO", approvedIncrease: 18.2, marketShare: "30%" },
      { name: "Ambetter", planType: "EPO", approvedIncrease: 37.8, marketShare: "15%" },
    ],
    protocols: [
      { title: "Subsidy Cliff Risk", action: "Monitor income for 400% FPL threshold." }
    ]
  },
  {
    id: "7",
    name: "Rating Area 7 (South Central Rural)",
    outlook2026: "Stable market but high OON risks for specialist care.",
    volatilityScore: 5,
    counties: ["Bedford", "Blair", "Cambria", "Huntingdon", "Somerset"],
    regionalInsights: [
      "Highmark remains the primary PPO option.",
      "UPMC expansion into Altoona area affecting HMO pricing."
    ],
    carriers: [
      { name: "Highmark BCBS", planType: "PPO", approvedIncrease: 11.2, marketShare: "55%" },
      { name: "UPMC Health Plan", planType: "HMO", approvedIncrease: 9.4, marketShare: "30%" },
      { name: "Geisinger", planType: "HMO", approvedIncrease: 12.1, marketShare: "15%" }
    ],
    protocols: [
      { title: "Specialist Access", action: "Verify Pittsburgh-based specialist coverage for rural residents." }
    ]
  },
  {
    id: "8",
    name: "Rating Area 8 (Philadelphia/SEPA)",
    outlook2026: "Extreme volatility. Independence facing aggressive shifts in specific tiers.",
    volatilityScore: 10,
    counties: ["Bucks", "Chester", "Delaware", "Montgomery", "Philadelphia"],
    regionalInsights: [
      "Highest rate of 'Unbundling' errors in the state.",
      "Independence Blue Cross retains 70% market share.",
      "Oscar Health volatility spike of 37.8% confirmed."
    ],
    carriers: [
      { name: "Independence Blue Cross", planType: "PPO", approvedIncrease: 15.2, marketShare: "70%" },
      { name: "Oscar Health", planType: "EPO", approvedIncrease: 37.8, marketShare: "15%" },
      { name: "Jefferson Health Plans", planType: "HMO", approvedIncrease: 9.8, marketShare: "10%" },
    ],
    protocols: [
      { title: "Forensic EOB Review", action: "Audit every EOB for unbundling errors." }
    ]
  },
  {
    id: "9",
    name: "Rating Area 9 (SEPA Rural)",
    outlook2026: "Suburban/Rural fringe areas facing high-cost outlier risks.",
    volatilityScore: 8,
    counties: ["Berks", "Lancaster", "York"],
    regionalInsights: [
      "Capital Blue Cross and Highmark overlap creating price wars.",
      "High enrollment in Silver plans triggers significant CSR volatility."
    ],
    carriers: [
      { name: "Capital Blue Cross", planType: "PPO", approvedIncrease: 14.8, marketShare: "40%" },
      { name: "Highmark BCBS", planType: "PPO", approvedIncrease: 12.5, marketShare: "35%" },
      { name: "Independence BC", planType: "PPO", approvedIncrease: 16.1, marketShare: "20%" }
    ],
    protocols: [
      { title: "CSR Management", action: "Audit eligibility for Cost Sharing Reductions at 250% FPL." }
    ]
  }
];