export const eventTypes = [
  "transaction",
  "login",
  "device_change",
  "account_update",
  "beneficiary_creation",
] as const;

export type EventType = (typeof eventTypes)[number];
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Decision = "approve" | "review" | "block";
export type PaymentStatus =
  | "initiated"
  | "in_flight"
  | "held"
  | "flagged"
  | "recalled"
  | "completed";
export type CaseStatus =
  | "new"
  | "investigating"
  | "escalated"
  | "recovered"
  | "closed";
export type UserRole =
  | "analyst"
  | "fraud_investigator"
  | "compliance_officer"
  | "admin"
  | "institution_partner";

export interface BehaviourSignals {
  amount_zscore?: number;
  velocity_5m?: number;
  velocity_24h?: number;
  device_age_hours?: number;
  device_reputation?: number;
  ip_risk?: number;
  geo_velocity_kmh?: number;
  account_age_days?: number;
  email_risk?: number;
  phone_risk?: number;
  behavior_deviation?: number;
  beneficiary_risk?: number;
  graph_risk?: number;
  consortium_hits?: number;
  blacklist_confidence?: number;
  sanctions_hit?: boolean;
  aml_risk?: number;
  payment_delay_seconds?: number;
  failed_logins_10m?: number;
}

export interface FraudEventInput {
  event_id?: string;
  event_type: EventType;
  user_id: string;
  institution_id: string;
  amount?: number;
  currency?: string;
  account_id?: string;
  device_id?: string;
  beneficiary_id?: string;
  merchant_id?: string;
  ip_address?: string;
  country?: string;
  channel?: "mobile" | "web" | "api" | "branch";
  signals?: BehaviourSignals;
  metadata?: Record<string, unknown>;
}

export interface ComponentScores {
  rule_engine: number;
  ml_anomaly: number;
  behavioural_profile: number;
  identity_graph: number;
  consortium_intelligence: number;
  aml_sanctions: number;
}

export interface ExplainabilityFactor {
  feature: string;
  impact: number;
  direction: "risk_increase" | "risk_decrease";
  evidence: string;
}

export interface RiskDecision {
  risk_score: number;
  risk_level: RiskLevel;
  decision: Decision;
  reasons: string[];
  component_scores: ComponentScores;
  latency_ms: number;
  explainability: {
    top_factors: ExplainabilityFactor[];
    model_version: string;
    policy_version: string;
  };
}

export interface Institution {
  id: string;
  name: string;
  country: string;
  trustScore: number;
  reputation: number;
  sharedAlerts: number;
  confirmedFraudRate: number;
  encryptedKeyId: string;
}

export interface Alert {
  id: string;
  eventId: string;
  title: string;
  severity: RiskLevel;
  institution: string;
  amount: number;
  currency: string;
  subjectHash: string;
  decision: Decision;
  reasons: string[];
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export interface PaymentHop {
  institution: string;
  country: string;
  status: PaymentStatus;
  timestamp: string;
  risk: number;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  origin: string;
  destination: string;
  status: PaymentStatus;
  recallAvailable: boolean;
  delayAnomaly: number;
  route: PaymentHop[];
  riskSignals: string[];
  updatedAt: string;
}

export interface InvestigationCase {
  id: string;
  title: string;
  status: CaseStatus;
  priority: RiskLevel;
  assignee: string;
  institution: string;
  alertId?: string;
  lossExposure: number;
  recoveryPotential: number;
  entities: string[];
  timeline: Array<{
    at: string;
    actor: string;
    action: string;
    detail: string;
  }>;
  evidence: Array<{
    id: string;
    type: string;
    label: string;
    confidence: number;
  }>;
  nextActions: string[];
  sarDraft: string;
  updatedAt: string;
}

export interface GraphNode {
  id: string;
  type: "user" | "device" | "email" | "ip" | "account" | "transaction" | "merchant";
  label: string;
  risk: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship:
    | "owns"
    | "used_on"
    | "transferred_to"
    | "linked_to"
    | "suspicious_connection";
  weight: number;
}

export interface FraudTypology {
  id: string;
  name: string;
  severity: RiskLevel;
  prevalence: number;
  sharedBy: number;
  indicators: string[];
}

export interface HeatmapPoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
  risk: number;
  alerts: number;
}

export interface OperatingMetrics {
  fraudDetectionRate: number;
  falsePositiveReduction: number;
  recoveryRate: number;
  decisionLatencyMs: number;
  analystEfficiencyGain: number;
  eventsPerMinute: number;
  blockedValue: number;
  recalledValue: number;
}

export interface AmlCustomerRisk {
  customerId: string;
  name: string;
  fraudRisk: number;
  amlRisk: number;
  sanctionsRisk: number;
  unifiedRisk: number;
  riskLevel: RiskLevel;
  drivers: string[];
}

export interface LearningState {
  modelVersion: string;
  lastRetrainedAt: string;
  driftIndex: number;
  labelledCases: number;
  falsePositiveRate: number;
  precisionLift: number;
  feedbackQueue: number;
}

export interface AuditEvent {
  id: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type AgentStatus = "idle" | "running" | "ready" | "needs_review";
export type AgentCategory =
  | "data_analysis"
  | "fraud_ring_detection"
  | "rule_optimization"
  | "dispute_management"
  | "osint"
  | "aml_ops"
  | "training";

export interface AgentCapability {
  id: string;
  name: string;
  category: AgentCategory;
  status: AgentStatus;
  automationRate: number;
  avgRuntimeSeconds: number;
  humanReviewRequired: boolean;
  description: string;
  examplePrompts: string[];
  lastRunAt: string;
}

export interface AgentRunResult {
  id: string;
  agentId: string;
  prompt: string;
  status: AgentStatus;
  confidence: number;
  completedAt: string;
  summary: string;
  findings: string[];
  recommendedActions: string[];
  generatedRule?: SuggestedRule;
  evidencePackageId?: string;
}

export interface MerchantRiskInsight {
  merchantId: string;
  merchantName: string;
  ageDays: number;
  sharedUsers: number;
  linkedMerchants: string[];
  dormantDays: number;
  sessionSpikePct: number;
  noAcquiringTransactions: boolean;
  deviceReuseCount: number;
  collusionScore: number;
  riskLevel: RiskLevel;
  findings: string[];
}

export interface SharedDeviceInsight {
  deviceId: string;
  sharedUsers: number;
  locations: Array<{
    city: string;
    country: string;
    lat: number;
    lng: number;
    users: number;
  }>;
  sessionRiskSignals: string[];
  linkedMerchants: string[];
  riskScore: number;
}

export interface AccountTakeoverInsight {
  userId: string;
  accountId: string;
  riskScore: number;
  last30DaySignals: string[];
  firstSeenDevice: string;
  currentDevice: string;
  geographyShift: string;
  recommendedAction: string;
}

export interface OsintFinding {
  entityName: string;
  riskLevel: RiskLevel;
  sourcesChecked: string[];
  findings: string[];
  adverseMediaSignals: string[];
  ownershipSignals: string[];
  recommendedAction: string;
  completedAt: string;
}

export interface DisputeEvidence {
  disputeId: string;
  cardNetwork: "Visa" | "Mastercard" | "Other";
  reasonCode: string;
  qualifiesForVisaCE30: boolean;
  confidence: number;
  customerId: string;
  merchantName: string;
  disputedTransaction: {
    id: string;
    amount: number;
    occurredAt: string;
  };
  compellingTransactions: Array<{
    id: string;
    amount: number;
    occurredAt: string;
    deviceId: string;
    ipAddress: string;
    shippingAddressMatch: boolean;
    accountLoginMatch: boolean;
  }>;
  evidenceSummary: string;
}

export interface LowHighPattern {
  userId: string;
  lowValueMerchant: string;
  highValueMerchant: string;
  lowValueAmount: number;
  highValueAmount: number;
  elapsedHours: number;
  riskScore: number;
}

export interface SuggestedRule {
  id: string;
  name: string;
  description: string;
  logic: string;
  expectedFireRate: number;
  expectedFalsePositiveReduction: number;
  action: "review" | "block" | "step_up" | "hold";
  backtestSummary: string;
}

export interface WorkforceImpact {
  manualHoursSavedMonthly: number;
  alertsAutoResolvedPct: number;
  falsePositiveQueueClearedPct: number;
  estimatedFteRedeployable: number;
  monthlyCostAvoidance: number;
  redeploymentRecommendations: string[];
  technicalFocusAreas: string[];
}

export interface TrainingLesson {
  id: string;
  title: string;
  durationMinutes: number;
  role: UserRole | "all";
  status: "locked" | "available" | "in_progress" | "completed";
  objectives: string[];
  simulationPrompt: string;
}

export interface LearningPath {
  id: string;
  title: string;
  subscriberTier: "core" | "enterprise" | "partner";
  completionPct: number;
  lessons: TrainingLesson[];
  certification: string;
}

export interface FacilitatedTrainingOffer {
  id: string;
  title: string;
  format: "remote" | "onsite" | "hybrid";
  duration: string;
  audience: string;
  outcomes: string[];
  includesSandbox: boolean;
}

export interface DemoVideoChapter {
  id: string;
  title: string;
  timestampSeconds: number;
  narration: string;
  focusArea: string;
}

export interface DemoVideo {
  id: string;
  title: string;
  durationSeconds: number;
  src: string;
  poster: string;
  chapters: DemoVideoChapter[];
  transcript: string[];
}

export interface AgenticOperations {
  agents: AgentCapability[];
  recentRuns: AgentRunResult[];
  merchantInsights: MerchantRiskInsight[];
  sharedDevices: SharedDeviceInsight[];
  accountTakeovers: AccountTakeoverInsight[];
  osintFindings: OsintFinding[];
  disputes: DisputeEvidence[];
  lowHighPatterns: LowHighPattern[];
  suggestedRules: SuggestedRule[];
  workforceImpact: WorkforceImpact;
  demoVideo: DemoVideo;
  learningPaths: LearningPath[];
  facilitatedTraining: FacilitatedTrainingOffer[];
}

export interface OperatingPicture {
  metrics: OperatingMetrics;
  alerts: Alert[];
  payments: Payment[];
  cases: InvestigationCase[];
  institutions: Institution[];
  typologies: FraudTypology[];
  heatmap: HeatmapPoint[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  riskDistribution: Array<{
    level: RiskLevel;
    count: number;
    color: string;
  }>;
  amlCustomers: AmlCustomerRisk[];
  learning: LearningState;
  audit: AuditEvent[];
  agenticOperations: AgenticOperations;
}
