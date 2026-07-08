import {
  AgentCapability,
  AgentRunResult,
  Alert,
  AmlCustomerRisk,
  AmlKycMandate,
  AuditEvent,
  DemoVideo,
  DisputeEvidence,
  FacilitatedTrainingOffer,
  FraudTypology,
  GraphEdge,
  GraphNode,
  HeatmapPoint,
  Institution,
  InvestigationCase,
  LearningState,
  LearningPath,
  LowHighPattern,
  MerchantRiskInsight,
  OperatingMetrics,
  OsintFinding,
  Payment,
  SharedDeviceInsight,
  SuggestedRule,
  WorkforceImpact,
  AccountTakeoverInsight,
} from "./domain";

const now = new Date();
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

export const institutions: Institution[] = [
  {
    id: "inst-afb",
    name: "AfriBank",
    country: "NG",
    trustScore: 94,
    reputation: 91,
    sharedAlerts: 1874,
    confirmedFraudRate: 74,
    encryptedKeyId: "vault://keys/consortium/afb",
  },
  {
    id: "inst-kora",
    name: "KoraPay",
    country: "KE",
    trustScore: 89,
    reputation: 86,
    sharedAlerts: 1392,
    confirmedFraudRate: 69,
    encryptedKeyId: "vault://keys/consortium/kora",
  },
  {
    id: "inst-safa",
    name: "Safra Mutual",
    country: "ZA",
    trustScore: 92,
    reputation: 88,
    sharedAlerts: 1178,
    confirmedFraudRate: 72,
    encryptedKeyId: "vault://keys/consortium/safa",
  },
  {
    id: "inst-cedi",
    name: "CediTrust",
    country: "GH",
    trustScore: 84,
    reputation: 82,
    sharedAlerts: 904,
    confirmedFraudRate: 63,
    encryptedKeyId: "vault://keys/consortium/cedi",
  },
];

export const alerts: Alert[] = [
  {
    id: "alt-9012",
    eventId: "evt-9012",
    title: "High-risk beneficiary added before transfer",
    severity: "critical",
    institution: "AfriBank",
    amount: 186000,
    currency: "USD",
    subjectHash: "usr_93f6a2c8",
    decision: "block",
    reasons: ["new beneficiary", "consortium mule match", "velocity anomaly"],
    location: { city: "Lagos", country: "NG", lat: 6.5244, lng: 3.3792 },
    createdAt: minutesAgo(3),
  },
  {
    id: "alt-8841",
    eventId: "evt-8841",
    title: "Geo-velocity login followed by account update",
    severity: "high",
    institution: "KoraPay",
    amount: 42000,
    currency: "USD",
    subjectHash: "usr_aa19de09",
    decision: "review",
    reasons: ["impossible travel", "new device", "email intelligence risk"],
    location: { city: "Nairobi", country: "KE", lat: -1.2921, lng: 36.8219 },
    createdAt: minutesAgo(8),
  },
  {
    id: "alt-8727",
    eventId: "evt-8727",
    title: "Merchant refund laundering pattern",
    severity: "high",
    institution: "Safra Mutual",
    amount: 78500,
    currency: "USD",
    subjectHash: "mrc_19db7e41",
    decision: "review",
    reasons: ["refund loop", "linked merchant cluster", "AML typology match"],
    location: { city: "Johannesburg", country: "ZA", lat: -26.2041, lng: 28.0473 },
    createdAt: minutesAgo(14),
  },
];

export const payments: Payment[] = [
  {
    id: "pay-8GPI-4419",
    amount: 186000,
    currency: "USD",
    origin: "AfriBank NG",
    destination: "Baltic Correspondent LV",
    status: "flagged",
    recallAvailable: true,
    delayAnomaly: 87,
    route: [
      {
        institution: "AfriBank NG",
        country: "NG",
        status: "initiated",
        timestamp: minutesAgo(11),
        risk: 64,
      },
      {
        institution: "Pan-African Switch",
        country: "GH",
        status: "held",
        timestamp: minutesAgo(7),
        risk: 79,
      },
      {
        institution: "Baltic Correspondent",
        country: "LV",
        status: "flagged",
        timestamp: minutesAgo(4),
        risk: 91,
      },
    ],
    riskSignals: ["new beneficiary", "cross-border route", "known mule IBAN"],
    updatedAt: minutesAgo(4),
  },
  {
    id: "pay-8GPI-4420",
    amount: 32500,
    currency: "USD",
    origin: "KoraPay KE",
    destination: "Gulf Exchange AE",
    status: "in_flight",
    recallAvailable: true,
    delayAnomaly: 46,
    route: [
      {
        institution: "KoraPay KE",
        country: "KE",
        status: "initiated",
        timestamp: minutesAgo(17),
        risk: 31,
      },
      {
        institution: "Regional Settlement Hub",
        country: "RW",
        status: "in_flight",
        timestamp: minutesAgo(9),
        risk: 43,
      },
    ],
    riskSignals: ["unusual payment hour", "device change within 1h"],
    updatedAt: minutesAgo(9),
  },
];

export const cases: InvestigationCase[] = [
  {
    id: "case-2048",
    title: "Suspected mule network funding round",
    status: "investigating",
    priority: "critical",
    assignee: "Amara Okafor",
    institution: "AfriBank",
    alertId: "alt-9012",
    lossExposure: 186000,
    recoveryPotential: 142000,
    entities: ["usr_93f6a2c8", "dev_a4fd", "acct_0041", "pay-8GPI-4419"],
    timeline: [
      {
        at: minutesAgo(21),
        actor: "fraud-engine-service",
        action: "risk_score",
        detail: "Transaction scored 92/100 with block decision.",
      },
      {
        at: minutesAgo(18),
        actor: "identity-graph-service",
        action: "link_analysis",
        detail: "Device linked to three prior mule accounts across two institutions.",
      },
      {
        at: minutesAgo(7),
        actor: "payment-tracking-service",
        action: "hold_payment",
        detail: "Payment held at Pan-African Switch with recall still available.",
      },
    ],
    evidence: [
      {
        id: "ev-graph-1",
        type: "identity_graph",
        label: "Shared device across mule cluster",
        confidence: 96,
      },
      {
        id: "ev-pay-1",
        type: "payment_route",
        label: "Correspondent leg matched known laundering route",
        confidence: 88,
      },
    ],
    nextActions: [
      "Issue payment recall before correspondent settlement closes.",
      "Request encrypted consortium corroboration for beneficiary hash.",
      "Escalate SAR draft to compliance officer.",
    ],
    sarDraft:
      "Subject initiated a high-value cross-border transfer shortly after adding a beneficiary with consortium mule indicators. Device and account graph analysis links the subject to multiple suspicious accounts.",
    updatedAt: minutesAgo(5),
  },
  {
    id: "case-2051",
    title: "Account takeover after impossible-travel login",
    status: "escalated",
    priority: "high",
    assignee: "Thabo Mbeki",
    institution: "KoraPay",
    alertId: "alt-8841",
    lossExposure: 42000,
    recoveryPotential: 39000,
    entities: ["usr_aa19de09", "ip_198_51_100_24", "dev_93ad"],
    timeline: [
      {
        at: minutesAgo(35),
        actor: "alert-stream-service",
        action: "alert",
        detail: "New-device login followed by beneficiary update.",
      },
      {
        at: minutesAgo(19),
        actor: "case-management-service",
        action: "escalate",
        detail: "Escalated after second failed step-up challenge.",
      },
    ],
    evidence: [
      {
        id: "ev-id-9",
        type: "digital_identity",
        label: "IP reputation and email age mismatch",
        confidence: 84,
      },
    ],
    nextActions: [
      "Freeze outbound transfers pending customer verification.",
      "Compare device hash against consortium alert feed.",
    ],
    sarDraft:
      "Account activity indicates likely account takeover based on impossible travel, new-device behavior, and failed authentication challenges.",
    updatedAt: minutesAgo(13),
  },
];

export const graphNodes: GraphNode[] = [
  { id: "usr_93f6a2c8", type: "user", label: "User hash", risk: 92, x: 52, y: 50 },
  { id: "dev_a4fd", type: "device", label: "Device A4FD", risk: 88, x: 35, y: 34 },
  { id: "acct_0041", type: "account", label: "Account 0041", risk: 81, x: 66, y: 35 },
  { id: "pay-8GPI-4419", type: "transaction", label: "Payment 4419", risk: 91, x: 78, y: 55 },
  { id: "mrc_19db7e41", type: "merchant", label: "Merchant cluster", risk: 76, x: 59, y: 74 },
  { id: "ip_198_51_100_24", type: "ip", label: "IP hash", risk: 73, x: 24, y: 62 },
  { id: "email_39da", type: "email", label: "Email hash", risk: 67, x: 42, y: 78 },
];

export const graphEdges: GraphEdge[] = [
  { id: "edge-1", source: "usr_93f6a2c8", target: "dev_a4fd", relationship: "used_on", weight: 0.92 },
  { id: "edge-2", source: "usr_93f6a2c8", target: "acct_0041", relationship: "owns", weight: 0.88 },
  { id: "edge-3", source: "acct_0041", target: "pay-8GPI-4419", relationship: "transferred_to", weight: 0.95 },
  { id: "edge-4", source: "dev_a4fd", target: "ip_198_51_100_24", relationship: "linked_to", weight: 0.74 },
  { id: "edge-5", source: "email_39da", target: "usr_93f6a2c8", relationship: "linked_to", weight: 0.69 },
  { id: "edge-6", source: "mrc_19db7e41", target: "acct_0041", relationship: "suspicious_connection", weight: 0.81 },
];

export const typologies: FraudTypology[] = [
  {
    id: "typ-mule-burst",
    name: "Mule account burst funding",
    severity: "critical",
    prevalence: 78,
    sharedBy: 17,
    indicators: ["new beneficiary", "rapid transfer chain", "shared device"],
  },
  {
    id: "typ-ato-geo",
    name: "ATO with geo-velocity pivot",
    severity: "high",
    prevalence: 62,
    sharedBy: 12,
    indicators: ["impossible travel", "new device", "failed step-up"],
  },
  {
    id: "typ-refund-loop",
    name: "Merchant refund laundering",
    severity: "high",
    prevalence: 48,
    sharedBy: 8,
    indicators: ["refund loop", "merchant cluster", "AML overlap"],
  },
];

export const heatmap: HeatmapPoint[] = [
  { city: "Lagos", country: "NG", lat: 6.5244, lng: 3.3792, risk: 91, alerts: 284 },
  { city: "Nairobi", country: "KE", lat: -1.2921, lng: 36.8219, risk: 78, alerts: 166 },
  { city: "Johannesburg", country: "ZA", lat: -26.2041, lng: 28.0473, risk: 72, alerts: 149 },
  { city: "Accra", country: "GH", lat: 5.6037, lng: -0.187, risk: 64, alerts: 98 },
  { city: "Cairo", country: "EG", lat: 30.0444, lng: 31.2357, risk: 58, alerts: 87 },
  { city: "Casablanca", country: "MA", lat: 33.5731, lng: -7.5898, risk: 52, alerts: 76 },
];

export const metrics: OperatingMetrics = {
  fraudDetectionRate: 93.4,
  falsePositiveReduction: 28.6,
  recoveryRate: 71.8,
  decisionLatencyMs: 146,
  analystEfficiencyGain: 41.2,
  eventsPerMinute: 18342,
  blockedValue: 4320000,
  recalledValue: 1180000,
};

export const amlCustomers: AmlCustomerRisk[] = [
  {
    customerId: "cust-9041",
    name: "Corporate remitter hash",
    fraudRisk: 91,
    amlRisk: 82,
    sanctionsRisk: 37,
    unifiedRisk: 86,
    riskLevel: "critical",
    drivers: ["layering route", "mule beneficiary", "high value burst"],
  },
  {
    customerId: "cust-2290",
    name: "Retail wallet hash",
    fraudRisk: 77,
    amlRisk: 53,
    sanctionsRisk: 12,
    unifiedRisk: 68,
    riskLevel: "high",
    drivers: ["ATO indicators", "new device", "rapid beneficiary update"],
  },
  {
    customerId: "cust-7811",
    name: "Merchant network hash",
    fraudRisk: 69,
    amlRisk: 74,
    sanctionsRisk: 21,
    unifiedRisk: 72,
    riskLevel: "high",
    drivers: ["refund loop", "merchant graph", "cash-out pattern"],
  },
];

export const amlKycMandate: AmlKycMandate = {
  title: "AML and KYC fund operations mandate",
  summary:
    "Private funds need a risk-based AML program that verifies every investor, screens ownership and sanctions exposure, and monitors investor activity through the fund lifecycle.",
  definitions: [
    {
      term: "Money laundering",
      description:
        "Illicit proceeds are placed, layered through complex transactions, and integrated back into the financial system as apparently legitimate assets.",
    },
    {
      term: "AML",
      description:
        "The full control framework for detecting, preventing, escalating, and reporting suspicious financial activity.",
    },
    {
      term: "KYC",
      description:
        "The identity verification and risk assessment process that supplies the data needed for customer due diligence.",
    },
  ],
  process: [
    {
      id: "cip",
      name: "Customer identification program",
      controls: [
        "Collect legal name, physical address, date of birth for individuals, and government or tax identifier.",
        "Verify investor information during subscription before capital is accepted.",
      ],
    },
    {
      id: "cdd",
      name: "Customer due diligence",
      controls: [
        "Screen investors, beneficial owners, and control persons against sanctions, watchlists, PEP, and adverse-media sources.",
        "Document the purpose of the relationship and maintain a risk profile for each LP or entity.",
      ],
    },
    {
      id: "edd",
      name: "Enhanced due diligence",
      controls: [
        "Escalate PEPs, high-risk jurisdictions, opaque ownership structures, and sanctions-adjacent exposure.",
        "Collect source-of-wealth, source-of-funds, and ownership evidence before approval.",
      ],
    },
    {
      id: "monitoring",
      name: "Continuous monitoring",
      controls: [
        "Rescreen LPs and related parties as lists and risk profiles change.",
        "Trigger alerts for suspicious transactions, ownership changes, or new adverse media.",
      ],
    },
  ],
  regulations: [
    { name: "Bank Secrecy Act", role: "Foundation for U.S. AML reporting and recordkeeping obligations." },
    { name: "USA PATRIOT Act", role: "Expanded AML controls and terrorist-financing safeguards." },
    { name: "FinCEN", role: "Primary U.S. administrator for AML rules and suspicious activity reporting." },
    { name: "OFAC", role: "Administers sanctions screening and enforcement exposure." },
    { name: "FATF", role: "Sets global AML and counter-terrorist-financing standards." },
  ],
  launderingStages: ["Placement", "Layering", "Integration"],
  programPillars: [
    "Designated compliance owner",
    "Written internal controls",
    "Ongoing employee training",
    "Independent testing or audit",
  ],
  consequences: [
    "Regulatory fines and sanctions enforcement",
    "Criminal exposure for willful non-compliance",
    "Loss of banking, LP, and counterparty confidence",
  ],
};

export const learning: LearningState = {
  modelVersion: "hybrid-risk-2026.07",
  lastRetrainedAt: minutesAgo(60 * 26),
  driftIndex: 0.17,
  labelledCases: 12842,
  falsePositiveRate: 7.8,
  precisionLift: 18.4,
  feedbackQueue: 37,
};

export const audit: AuditEvent[] = [
  {
    id: "aud-1",
    actor: "amara.okafor",
    role: "fraud_investigator",
    action: "payment.recall.requested",
    target: "pay-8GPI-4419",
    metadata: { reason: "critical fraud score", encrypted: true },
    createdAt: minutesAgo(6),
  },
  {
    id: "aud-2",
    actor: "system",
    role: "admin",
    action: "case.auto_created",
    target: "case-2048",
    metadata: { policy: "critical-risk-auto-case-v4" },
    createdAt: minutesAgo(21),
  },
];

export const agentCapabilities: AgentCapability[] = [
  {
    id: "agent-data-analyst",
    name: "Data Analyst Agent",
    category: "data_analysis",
    status: "ready",
    automationRate: 86,
    avgRuntimeSeconds: 34,
    humanReviewRequired: false,
    description: "Runs natural-language investigations across transactions, sessions, merchants, devices, disputes, and cases.",
    examplePrompts: [
      "Identify merchants with a high concentration of shared users.",
      "Show users moving from low-value to high-value merchant activity in the last 30 days.",
    ],
    lastRunAt: minutesAgo(12),
  },
  {
    id: "agent-graph-analyst",
    name: "Graph Analyst Agent",
    category: "fraud_ring_detection",
    status: "ready",
    automationRate: 79,
    avgRuntimeSeconds: 41,
    humanReviewRequired: true,
    description: "Maps connections across users, devices, IPs, emails, merchants, accounts, and payments to surface fraud rings.",
    examplePrompts: [
      "Map shared devices and locations for the top 10 device IDs.",
      "Review email addresses for common merchants and collusion signals.",
    ],
    lastRunAt: minutesAgo(18),
  },
  {
    id: "agent-osint",
    name: "OSINT Search Agent",
    category: "osint",
    status: "ready",
    automationRate: 72,
    avgRuntimeSeconds: 58,
    humanReviewRequired: true,
    description: "Collects public registry, web, adverse media, domain, and ownership signals for EDD and merchant reviews.",
    examplePrompts: ["Perform an OSINT search on [entity_name] and return relevant findings."],
    lastRunAt: minutesAgo(24),
  },
  {
    id: "agent-rule-assistant",
    name: "Rule Assistant Agent",
    category: "rule_optimization",
    status: "ready",
    automationRate: 91,
    avgRuntimeSeconds: 26,
    humanReviewRequired: true,
    description: "Turns plain-language fraud and AML hypotheses into testable monitoring rules with expected fire rates.",
    examplePrompts: [
      "Suggest a rule for merchants under 90 days old with no acquiring transactions and reused devices.",
    ],
    lastRunAt: minutesAgo(9),
  },
  {
    id: "agent-dispute",
    name: "Dispute Filing Agent",
    category: "dispute_management",
    status: "ready",
    automationRate: 83,
    avgRuntimeSeconds: 44,
    humanReviewRequired: true,
    description: "Builds network-ready evidence packages for chargebacks, including Visa Compelling Evidence 3.0 checks.",
    examplePrompts: [
      "Determine whether any disputes qualify for Visa Compelling Evidence 3.0.",
    ],
    lastRunAt: minutesAgo(31),
  },
  {
    id: "agent-aml-ops",
    name: "Agentic AML Ops",
    category: "aml_ops",
    status: "ready",
    automationRate: 88,
    avgRuntimeSeconds: 52,
    humanReviewRequired: true,
    description: "Clears low-risk AML queues, assembles EDD, screens adverse media, and drafts SAR narratives with audit trails.",
    examplePrompts: [
      "Review the last 30 days of activity and identify potential account takeover cases.",
      "Resolve sanctions false positives with customer and transaction context.",
    ],
    lastRunAt: minutesAgo(6),
  },
];

export const merchantInsights: MerchantRiskInsight[] = [
  {
    merchantId: "mrc-velo-184",
    merchantName: "Velo Digital Goods",
    ageDays: 42,
    sharedUsers: 318,
    linkedMerchants: ["Luno Arcade", "Atlas Voucher Hub", "Northstar Skins"],
    dormantDays: 64,
    sessionSpikePct: 870,
    noAcquiringTransactions: true,
    deviceReuseCount: 23,
    collusionScore: 91,
    riskLevel: "critical",
    findings: [
      "High overlap of user hashes with three merchants that share payout devices.",
      "Dormant for 64 days, then spiked from 7 to 68 sessions per hour.",
      "No acquiring transactions despite checkout sessions and refund attempts.",
    ],
  },
  {
    merchantId: "mrc-luno-092",
    merchantName: "Luno Arcade",
    ageDays: 76,
    sharedUsers: 244,
    linkedMerchants: ["Velo Digital Goods", "Northstar Skins"],
    dormantDays: 61,
    sessionSpikePct: 640,
    noAcquiringTransactions: false,
    deviceReuseCount: 17,
    collusionScore: 84,
    riskLevel: "critical",
    findings: [
      "Shared users moved from low-value card tests to high-value digital purchases.",
      "Same administrative device appeared on two merchant dashboards.",
    ],
  },
  {
    merchantId: "mrc-atlas-771",
    merchantName: "Atlas Voucher Hub",
    ageDays: 28,
    sharedUsers: 189,
    linkedMerchants: ["Velo Digital Goods", "Cape Mobile Trade"],
    dormantDays: 69,
    sessionSpikePct: 512,
    noAcquiringTransactions: true,
    deviceReuseCount: 12,
    collusionScore: 77,
    riskLevel: "high",
    findings: [
      "New merchant with no acquiring history and a reused operator device.",
      "Spike concentrated in VPN-heavy sessions from Lagos and Accra.",
    ],
  },
  {
    merchantId: "mrc-cape-330",
    merchantName: "Cape Mobile Trade",
    ageDays: 118,
    sharedUsers: 143,
    linkedMerchants: ["Atlas Voucher Hub"],
    dormantDays: 60,
    sessionSpikePct: 406,
    noAcquiringTransactions: false,
    deviceReuseCount: 9,
    collusionScore: 68,
    riskLevel: "high",
    findings: [
      "Dormant account resumed with session mix inconsistent with historic business model.",
      "Card testing attempts routed through shared IP range.",
    ],
  },
];

export const sharedDeviceInsights: SharedDeviceInsight[] = [
  {
    deviceId: "dev-fp-88a1",
    sharedUsers: 47,
    locations: [
      { city: "Lagos", country: "NG", lat: 6.5244, lng: 3.3792, users: 22 },
      { city: "Accra", country: "GH", lat: 5.6037, lng: -0.187, users: 14 },
      { city: "Nairobi", country: "KE", lat: -1.2921, lng: 36.8219, users: 11 },
    ],
    sessionRiskSignals: ["residential proxy", "copy-paste in card fields", "timezone mismatch"],
    linkedMerchants: ["Velo Digital Goods", "Luno Arcade"],
    riskScore: 94,
  },
  {
    deviceId: "dev-fp-19cc",
    sharedUsers: 39,
    locations: [
      { city: "Johannesburg", country: "ZA", lat: -26.2041, lng: 28.0473, users: 18 },
      { city: "Casablanca", country: "MA", lat: 33.5731, lng: -7.5898, users: 9 },
    ],
    sessionRiskSignals: ["headless browser", "payment method cycling", "rapid signups"],
    linkedMerchants: ["Northstar Skins", "Cape Mobile Trade"],
    riskScore: 89,
  },
  {
    deviceId: "dev-fp-73de",
    sharedUsers: 33,
    locations: [
      { city: "Cairo", country: "EG", lat: 30.0444, lng: 31.2357, users: 16 },
      { city: "Lagos", country: "NG", lat: 6.5244, lng: 3.3792, users: 8 },
    ],
    sessionRiskSignals: ["impossible travel", "VPN exit node", "new beneficiary within session"],
    linkedMerchants: ["Atlas Voucher Hub"],
    riskScore: 83,
  },
  {
    deviceId: "dev-fp-0a41",
    sharedUsers: 28,
    locations: [
      { city: "Nairobi", country: "KE", lat: -1.2921, lng: 36.8219, users: 15 },
      { city: "Accra", country: "GH", lat: 5.6037, lng: -0.187, users: 7 },
    ],
    sessionRiskSignals: ["emulator signals", "SIM country mismatch", "bot-like navigation"],
    linkedMerchants: ["Velo Digital Goods"],
    riskScore: 79,
  },
];

export const accountTakeovers: AccountTakeoverInsight[] = [
  {
    userId: "usr_aa19de09",
    accountId: "acct-7782",
    riskScore: 92,
    last30DaySignals: ["new device", "impossible travel", "password reset", "beneficiary update", "failed step-up"],
    firstSeenDevice: "dev-trusted-1102",
    currentDevice: "dev-fp-88a1",
    geographyShift: "Nairobi to Lagos in 43 minutes",
    recommendedAction: "Freeze outbound movement and require assisted identity reverification.",
  },
  {
    userId: "usr_d7bc9011",
    accountId: "acct-4419",
    riskScore: 86,
    last30DaySignals: ["email change", "proxy session", "high-value payout", "device fingerprint collision"],
    firstSeenDevice: "dev-trusted-8840",
    currentDevice: "dev-fp-73de",
    geographyShift: "Accra to Cairo in 61 minutes",
    recommendedAction: "Route to ATO queue and revoke active sessions.",
  },
  {
    userId: "usr_fa22093d",
    accountId: "acct-6641",
    riskScore: 78,
    last30DaySignals: ["remote access tool", "copy-paste in OTP", "changed payout account"],
    firstSeenDevice: "dev-trusted-6620",
    currentDevice: "dev-fp-19cc",
    geographyShift: "Johannesburg to Casablanca in 2 hours",
    recommendedAction: "Hold payout and initiate customer contact.",
  },
];

export const osintFindings: OsintFinding[] = [
  {
    entityName: "Velo Digital Goods",
    riskLevel: "high",
    sourcesChecked: ["business registry", "domain WHOIS", "adverse media", "social web", "sanctions aliases"],
    findings: [
      "Domain registration changed 9 days before session spike.",
      "Declared digital goods category conflicts with observed voucher resale content.",
      "Two linked domains use the same analytics tag and support email hash.",
    ],
    adverseMediaSignals: ["complaint forum references to non-delivery", "high refund chatter"],
    ownershipSignals: ["operator email hash appears on Atlas Voucher Hub", "shared phone hash with prior closed merchant"],
    recommendedAction: "Open EDD review, validate beneficial owner, and restrict settlement until review completes.",
    completedAt: minutesAgo(18),
  },
];

export const disputes: DisputeEvidence[] = [
  {
    disputeId: "disp-visa-3001",
    cardNetwork: "Visa",
    reasonCode: "10.4",
    qualifiesForVisaCE30: true,
    confidence: 91,
    customerId: "cust-2290",
    merchantName: "Velo Digital Goods",
    disputedTransaction: {
      id: "txn-disputed-9901",
      amount: 460,
      occurredAt: minutesAgo(60 * 24 * 4),
    },
    compellingTransactions: [
      {
        id: "txn-ce3-1101",
        amount: 89,
        occurredAt: minutesAgo(60 * 24 * 96),
        deviceId: "dev-fp-88a1",
        ipAddress: "198.51.100.24",
        shippingAddressMatch: true,
        accountLoginMatch: true,
      },
      {
        id: "txn-ce3-1102",
        amount: 112,
        occurredAt: minutesAgo(60 * 24 * 73),
        deviceId: "dev-fp-88a1",
        ipAddress: "198.51.100.24",
        shippingAddressMatch: true,
        accountLoginMatch: true,
      },
      {
        id: "txn-ce3-1103",
        amount: 134,
        occurredAt: minutesAgo(60 * 24 * 41),
        deviceId: "dev-fp-88a1",
        ipAddress: "198.51.100.24",
        shippingAddressMatch: true,
        accountLoginMatch: true,
      },
    ],
    evidenceSummary:
      "Three prior undisputed transactions match account login, device, IP, and shipping evidence for the disputed cardholder.",
  },
  {
    disputeId: "disp-visa-3002",
    cardNetwork: "Visa",
    reasonCode: "10.4",
    qualifiesForVisaCE30: false,
    confidence: 48,
    customerId: "cust-7811",
    merchantName: "Cape Mobile Trade",
    disputedTransaction: {
      id: "txn-disputed-9902",
      amount: 810,
      occurredAt: minutesAgo(60 * 24 * 2),
    },
    compellingTransactions: [],
    evidenceSummary: "No three qualifying prior transactions with consistent device and address evidence were found.",
  },
];

export const lowHighPatterns: LowHighPattern[] = [
  {
    userId: "usr_93f6a2c8",
    lowValueMerchant: "Northstar Skins",
    highValueMerchant: "Velo Digital Goods",
    lowValueAmount: 2.1,
    highValueAmount: 620,
    elapsedHours: 4,
    riskScore: 88,
  },
  {
    userId: "usr_aa19de09",
    lowValueMerchant: "Atlas Voucher Hub",
    highValueMerchant: "Luno Arcade",
    lowValueAmount: 1.4,
    highValueAmount: 475,
    elapsedHours: 7,
    riskScore: 82,
  },
  {
    userId: "usr_d7bc9011",
    lowValueMerchant: "Cape Mobile Trade",
    highValueMerchant: "Velo Digital Goods",
    lowValueAmount: 3.2,
    highValueAmount: 910,
    elapsedHours: 12,
    riskScore: 79,
  },
];

export const suggestedRules: SuggestedRule[] = [
  {
    id: "rule-new-merchant-reused-device",
    name: "New merchant with reused operator device",
    description:
      "Review or hold merchants under 90 days old, with no acquiring transactions, when their device has been used by more than five accounts.",
    logic:
      "merchant.age_days < 90 AND merchant.acquiring_txn_count = 0 AND device.distinct_account_count > 5",
    expectedFireRate: 1.8,
    expectedFalsePositiveReduction: 22,
    action: "review",
    backtestSummary:
      "Backtest across 90 days found 42 merchant events, 31 confirmed risky, and avoided broad review of 1,690 low-risk merchants.",
  },
  {
    id: "rule-dormant-session-spike",
    name: "Dormant merchant session spike",
    description:
      "Escalate merchants dormant for at least 60 days when session activity rises more than 300 percent and device risk exceeds 70.",
    logic:
      "merchant.dormant_days >= 60 AND session.spike_pct > 300 AND device.risk_score >= 70",
    expectedFireRate: 2.4,
    expectedFalsePositiveReduction: 18,
    action: "step_up",
    backtestSummary:
      "Captured 86 percent of dormant-pivot incidents with 18 percent fewer false positives than a flat volume rule.",
  },
];

export const workforceImpact: WorkforceImpact = {
  manualHoursSavedMonthly: 1280,
  alertsAutoResolvedPct: 74,
  falsePositiveQueueClearedPct: 68,
  estimatedFteRedeployable: 7.4,
  monthlyCostAvoidance: 214000,
  redeploymentRecommendations: [
    "Move L1 reviewers from repetitive false-positive queues into complex investigations and merchant EDD.",
    "Shift operations capacity into rule QA, model governance, and regulatory reporting quality control.",
    "Use agentic dispute evidence collection to reduce manual chargeback assembly work.",
  ],
  technicalFocusAreas: [
    "Real-time payment interdiction tuning",
    "Fraud ring disruption playbooks",
    "Model drift and calibration reviews",
    "Partner and sponsor-bank oversight",
  ],
};

export const demoVideo: DemoVideo = {
  id: "demo-agentic-ops",
  title: "African Guard Agentic Fraud Ops Walkthrough",
  durationSeconds: 390,
  src: "/demo/african-guard-agentic-ops-demo.mp4",
  poster: "/demo/agentic-ops-poster.svg",
  chapters: [
    {
      id: "demo-1",
      title: "Command center orientation",
      timestampSeconds: 0,
      narration: "Start with live risk, queue automation, fraud losses prevented, and team capacity saved.",
      focusArea: "Operating console",
    },
    {
      id: "demo-2",
      title: "Run analyst agents",
      timestampSeconds: 54,
      narration: "Use the Data Analyst, Graph Analyst, OSINT, Dispute, and Rule Assistant agents from one workspace.",
      focusArea: "Agentic workflows",
    },
    {
      id: "demo-3",
      title: "Investigate merchant collusion",
      timestampSeconds: 122,
      narration: "Review shared users, dormant merchant spikes, linked devices, and collusion scores.",
      focusArea: "Merchant risk",
    },
    {
      id: "demo-4",
      title: "Build dispute evidence",
      timestampSeconds: 205,
      narration: "Open the dispute panel to see Visa Compelling Evidence 3.0 qualification and the three supporting transactions.",
      focusArea: "Disputes",
    },
    {
      id: "demo-5",
      title: "Train teams",
      timestampSeconds: 292,
      narration: "Launch guided learning paths or request facilitated training for analysts, investigators, compliance, and partners.",
      focusArea: "Training academy",
    },
  ],
  transcript: [
    "African Guard reduces manual review volume by letting governed AI agents handle repeatable analysis and evidence gathering.",
    "Analysts can ask plain-language questions about merchants, devices, account takeovers, disputes, and transaction patterns.",
    "Every recommendation keeps evidence, confidence, generated rules, and human review controls attached.",
    "Subscriber training paths teach teams how to operate the platform; facilitated remote, onsite, or hybrid training is available for larger deployments.",
  ],
};

export const learningPaths: LearningPath[] = [
  {
    id: "path-fraud-ops",
    title: "Agentic Fraud Ops Certification",
    subscriberTier: "core",
    completionPct: 42,
    certification: "African Guard Certified Fraud Operator",
    lessons: [
      {
        id: "lesson-agent-basics",
        title: "Run safe agent investigations",
        durationMinutes: 18,
        role: "analyst",
        status: "completed",
        objectives: ["Choose the right agent", "Read confidence and evidence", "Escalate when human review is required"],
        simulationPrompt: "Review activity from the last 30 days and identify potential account takeover cases.",
      },
      {
        id: "lesson-merchant-risk",
        title: "Detect merchant collusion and dormant spikes",
        durationMinutes: 24,
        role: "fraud_investigator",
        status: "in_progress",
        objectives: ["Interpret shared-user concentration", "Validate linked merchants", "Apply step-up workflows"],
        simulationPrompt: "Identify merchants that have been dormant in the last 60 days but now show a session spike.",
      },
      {
        id: "lesson-rules",
        title: "Create, backtest, and deploy monitoring rules",
        durationMinutes: 21,
        role: "admin",
        status: "available",
        objectives: ["Convert natural language into logic", "Read fire-rate estimates", "Document rule rationale"],
        simulationPrompt: "Suggest a rule for merchants under 90 days old with no acquiring transactions and reused devices.",
      },
    ],
  },
  {
    id: "path-aml-compliance",
    title: "Agentic AML and Case Governance",
    subscriberTier: "enterprise",
    completionPct: 28,
    certification: "African Guard Certified AML Workflow Owner",
    lessons: [
      {
        id: "lesson-osint",
        title: "OSINT and adverse media review",
        durationMinutes: 27,
        role: "compliance_officer",
        status: "available",
        objectives: ["Run entity research", "Record adverse media rationale", "Attach EDD evidence"],
        simulationPrompt: "Perform an OSINT search on Velo Digital Goods and return relevant findings.",
      },
      {
        id: "lesson-sar",
        title: "SAR narrative and two-eyes review",
        durationMinutes: 31,
        role: "compliance_officer",
        status: "locked",
        objectives: ["Draft SAR narratives", "Use evidence citations", "Route for approval"],
        simulationPrompt: "Summarize the fraud ring case and generate a SAR narrative.",
      },
    ],
  },
];

export const facilitatedTraining: FacilitatedTrainingOffer[] = [
  {
    id: "train-remote",
    title: "Remote analyst onboarding workshop",
    format: "remote",
    duration: "2 half-days",
    audience: "Analysts, fraud investigators, and team leads",
    outcomes: ["Operational readiness", "Agent prompting playbooks", "Queue triage SOP alignment"],
    includesSandbox: true,
  },
  {
    id: "train-onsite",
    title: "Onsite fraud and AML transformation sprint",
    format: "onsite",
    duration: "3 days",
    audience: "Fraud, compliance, product risk, and engineering leadership",
    outcomes: ["Workflow redesign", "Rule library calibration", "Capacity redeployment plan"],
    includesSandbox: true,
  },
  {
    id: "train-hybrid",
    title: "Hybrid sponsor-bank supervision academy",
    format: "hybrid",
    duration: "4 weeks",
    audience: "Sponsor banks, fintech programs, and partner institutions",
    outcomes: ["Program oversight model", "Audit-ready reporting", "Facilitated certification labs"],
    includesSandbox: true,
  },
];

export const recentAgentRuns: AgentRunResult[] = [
  {
    id: "run-merchant-collusion",
    agentId: "agent-graph-analyst",
    prompt: "Identify merchants with a high concentration of shared users and links indicating collusion.",
    status: "needs_review",
    confidence: 91,
    completedAt: minutesAgo(8),
    summary:
      "Four merchants show concentrated shared users, common device infrastructure, and dormant-to-spike behavior consistent with coordinated merchant abuse.",
    findings: [
      "Velo Digital Goods and Luno Arcade share 244 users and 17 operator-device links.",
      "Atlas Voucher Hub is under 90 days old, has no acquiring transactions, and uses a device tied to 12 accounts.",
      "Session spikes are concentrated after 60+ days of dormancy.",
    ],
    recommendedActions: [
      "Open merchant EDD for Velo Digital Goods and Atlas Voucher Hub.",
      "Deploy new-merchant reused-device rule in review mode.",
      "Hold settlement for merchants with collusion score above 85.",
    ],
    generatedRule: suggestedRules[0],
  },
  {
    id: "run-dispute-ce30",
    agentId: "agent-dispute",
    prompt: "Determine whether any disputes qualify for Visa Compelling Evidence 3.0.",
    status: "ready",
    confidence: 91,
    completedAt: minutesAgo(14),
    summary:
      "Dispute disp-visa-3001 qualifies with three prior undisputed transactions that match device, IP, login, and address evidence.",
    findings: [
      "Three qualifying transactions found within the historical window.",
      "Device ID and IP evidence match across the disputed cardholder profile.",
    ],
    recommendedActions: ["Submit CE 3.0 package for disp-visa-3001.", "Keep disp-visa-3002 in manual review."],
    evidencePackageId: "ce30-package-disp-visa-3001",
  },
];
