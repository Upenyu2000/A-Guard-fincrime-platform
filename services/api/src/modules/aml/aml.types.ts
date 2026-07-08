import { AuditEvent, GraphEdge, GraphNode, RiskLevel, UserRole } from "../../domain";

export type AmlDecision =
  | "approve"
  | "approve_monitor"
  | "step_up"
  | "review"
  | "hold"
  | "block"
  | "escalate";

export type AmlTransactionStatus = "approved" | "review" | "held" | "blocked" | "failed" | "reversed" | "refunded";
export type AmlAlertStatus =
  | "new"
  | "unassigned"
  | "assigned"
  | "in_review"
  | "information_requested"
  | "escalated"
  | "converted_to_case"
  | "closed_false_positive"
  | "closed_explained_activity"
  | "closed_with_monitoring"
  | "confirmed_suspicious"
  | "referred_to_mlro";
export type VerificationStatus =
  | "not_started"
  | "information_requested"
  | "verification_in_progress"
  | "passed"
  | "referred"
  | "edd_required"
  | "rejected"
  | "expired"
  | "review_overdue";
export type ScreeningResultStatus =
  | "live_provider_result"
  | "mock_result"
  | "test_result"
  | "manual_verification_required"
  | "provider_unavailable"
  | "screening_not_completed";
export type AmlRuleStatus = "draft" | "pending_approval" | "approved" | "active" | "inactive" | "retired";
export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";
export type SarStatus = "draft" | "ready_for_review" | "approved" | "rejected";
export type RollingWindowName = "1m" | "5m" | "15m" | "1h" | "6h" | "24h" | "7d" | "30d";

export interface RollingWindowMetrics {
  window: RollingWindowName;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  medianAmount: number;
  uniqueSenders: number;
  uniqueRecipients: number;
  uniqueAccounts: number;
  uniqueDevices: number;
  uniqueIpAddresses: number;
  uniqueCountries: number;
  uniqueInstitutions: number;
  percentageBelowThreshold: number;
  incomingToOutgoingRatio: number;
  averagePassThroughMinutes: number;
  balanceRetentionRatio: number;
  beneficiaryCreationToPaymentMinutes: number | null;
}

export interface AmlScoreBreakdown {
  deterministicRules: number;
  mlAnomaly: number;
  behaviouralProfile: number;
  identityGraph: number;
  consortiumIntelligence: number;
  amlSanctions: number;
  customerKyc: number;
  businessKyb: number;
  deviceRisk: number;
  geographicRisk: number;
  beneficiaryRisk: number;
  transactionVelocity: number;
  microtransactionCluster: number;
  historicalOutcomes: number;
}

export interface AmlExplainabilityFactor {
  feature: string;
  impact: number;
  direction: "risk_increase" | "risk_decrease";
  evidence: string;
}

export interface AmlRiskDecision {
  fraudRisk: number;
  amlRisk: number;
  unifiedRisk: number;
  riskLevel: RiskLevel;
  decision: AmlDecision;
  reasons: string[];
  componentScores: AmlScoreBreakdown;
  explainability: AmlExplainabilityFactor[];
  policyVersion: string;
  modelVersion: string;
  confidence: number;
  dataQualityWarnings: string[];
  rollingWindows: RollingWindowMetrics[];
}

export interface AmlTransaction {
  id: string;
  eventId: string;
  institution: string;
  customerId: string;
  businessId?: string;
  accountId: string;
  walletId?: string;
  sender: string;
  receiver: string;
  beneficiary: string;
  merchant?: string;
  amount: number;
  currency: string;
  baseCurrencyEquivalent: number;
  originCountry: string;
  destinationCountry: string;
  channel: "mobile_money" | "wallet" | "bank" | "card" | "api" | "cash_agent" | "branch";
  paymentMethod: string;
  deviceId: string;
  ipAddress: string;
  phoneHash?: string;
  addressHash?: string;
  beneficialOwnerId?: string;
  description: string;
  direction: "incoming" | "outgoing";
  timestamp: string;
  status: AmlTransactionStatus;
  fraudRisk: number;
  amlRisk: number;
  unifiedRisk: number;
  decision: AmlDecision;
  rulesTriggered: string[];
  alertStatus: AmlAlertStatus | "none";
  componentScores: AmlScoreBreakdown;
  explainability: AmlExplainabilityFactor[];
  linkedTransactionIds: string[];
  linkedDevices: string[];
  linkedIpAddresses: string[];
  linkedAccounts: string[];
  sharedBeneficiaries: string[];
  historicalAlerts: string[];
  recommendedAction: string;
}

export interface CustomerKycProfile {
  id: string;
  fullLegalName: string;
  previousNames: string[];
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  residentialAddress: string;
  telephoneNumber: string;
  emailAddress: string;
  occupation: string;
  employer: string;
  expectedAccountPurpose: string;
  expectedMonthlyIncome: number;
  expectedTransactionVolume: number;
  expectedPaymentCorridors: string[];
  expectedCounterparties: string[];
  sourceOfFunds: string;
  sourceOfWealth: string;
  identityDocument: {
    type: string;
    issuingCountry: string;
    maskedNumber: string;
    expiresAt: string;
  };
  addressVerificationStatus: VerificationStatus;
  livenessStatus: VerificationStatus;
  deviceInformation: string[];
  taxResidency: string[];
  customerRiskScore: number;
  kycStatus: VerificationStatus;
  lastReviewDate: string;
  nextReviewDate: string;
  checks: Array<{
    name: string;
    status: ScreeningResultStatus | VerificationStatus;
    risk: RiskLevel;
    evidence: string;
  }>;
  edd: {
    required: boolean;
    seniorApproval: ApprovalStatus;
    relationshipReason: string;
    transactionPurpose: string;
    supportingDocuments: string[];
    monitoringFrequency: string;
    temporaryRestrictions: string[];
    investigatorNotes: string[];
  };
}

export interface BusinessKybProfile {
  id: string;
  legalName: string;
  tradingName: string;
  companyNumber: string;
  incorporationDate: string;
  incorporationCountry: string;
  registeredAddress: string;
  tradingAddress: string;
  businessType: string;
  industry: string;
  website: string;
  emailDomain: string;
  declaredTurnover: number;
  expectedTransactionVolume: number;
  countriesOfOperation: string[];
  regulatoryStatus: string;
  directors: Array<{ id: string; name: string; country: string; risk: RiskLevel }>;
  shareholders: Array<{ id: string; name: string; ownershipPct: number; risk: RiskLevel }>;
  ultimateBeneficialOwners: Array<{ id: string; name: string; ownershipPct: number; risk: RiskLevel }>;
  parentEntities: string[];
  subsidiaries: string[];
  sourceOfBusinessFunds: string;
  businessRelationshipPurpose: string;
  licences: string[];
  taxInformation: string;
  kybStatus: VerificationStatus;
  riskScore: number;
  lastReviewDate: string;
  nextReviewDate: string;
  indicators: string[];
  ownershipGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface ScreeningCheck {
  id: string;
  subjectId: string;
  subjectType: "customer" | "business" | "director" | "ubo" | "counterparty" | "device" | "ip";
  checkType:
    | "sanctions"
    | "pep"
    | "adverse_media"
    | "identity"
    | "company"
    | "ubo"
    | "address"
    | "device"
    | "ip"
    | "source_of_funds";
  provider: string;
  resultStatus: ScreeningResultStatus;
  datasetVersion: string;
  checkedAt: string;
  matchScore: number;
  matchingFields: string[];
  disposition: "clear" | "possible_match" | "true_match" | "false_positive" | "needs_review";
  reviewer?: string;
  evidence: string[];
  nextReviewDate: string;
}

export interface AmlRule {
  id: string;
  name: string;
  description: string;
  category:
    | "structuring"
    | "smurfing"
    | "fan_in"
    | "fan_out"
    | "rapid_pass_through"
    | "circular_funds"
    | "dormant_reactivation"
    | "cross_border"
    | "mobile_money"
    | "beneficiary_risk"
    | "account_testing"
    | "device_change"
    | "mule_account"
    | "kyb"
    | "screening"
    | "source_of_funds";
  jurisdiction: string;
  institution: string;
  customerSegment: string;
  businessSegment: string;
  transactionChannel: string;
  field: string;
  operator:
    | "equals"
    | "not_equal"
    | "greater_than"
    | "less_than"
    | "between"
    | "contains"
    | "in_list"
    | "not_in_list"
    | "count_within_window"
    | "sum_within_window"
    | "average_within_window"
    | "percentage_below_threshold"
    | "deviation_from_baseline"
    | "standard_deviation_anomaly"
    | "shared_graph_attribute"
    | "graph_distance_relationship";
  comparisonValue: string;
  aggregation: "count" | "sum" | "average" | "median" | "percentage" | "graph";
  rollingWindow: RollingWindowName;
  countThreshold: number;
  cumulativeThreshold: number;
  scoreContribution: number;
  priority: RiskLevel;
  action: AmlDecision;
  effectiveDate: string;
  expiryDate?: string;
  owner: string;
  version: number;
  approvalStatus: ApprovalStatus;
  productionStatus: AmlRuleStatus;
  logic: {
    join: "AND" | "OR";
    conditions: Array<{ field: string; operator: AmlRule["operator"]; value: string }>;
  };
  estimatedAlertVolume: number;
  estimatedFalsePositiveRate: number;
  performance: {
    truePositiveRate: number;
    falsePositiveRate: number;
    lastBacktestedAt: string;
  };
  versionHistory: Array<{
    version: number;
    changedAt: string;
    changedBy: string;
    reason: string;
  }>;
}

export interface MicrotransactionCluster {
  id: string;
  scenario:
    | "structuring"
    | "smurfing"
    | "fan_in"
    | "fan_out"
    | "rapid_pass_through"
    | "threshold_avoidance"
    | "micro_deposit_testing"
    | "machine_like"
    | "dormant_reactivation"
    | "mobile_money_consolidation";
  title: string;
  riskLevel: RiskLevel;
  riskScore: number;
  transactionIds: string[];
  customerIds: string[];
  businessIds: string[];
  deviceIds: string[];
  ipAddresses: string[];
  rollingWindow: RollingWindowName;
  transactionCount: number;
  cumulativeAmount: number;
  averageAmount: number;
  thresholdAvoidancePct: number;
  evidence: string[];
  recommendedAction: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface AmlAlert {
  id: string;
  category: AmlRule["category"] | "screening" | "kyc" | "kyb";
  eventId: string;
  subjectId: string;
  subjectType: "customer" | "business" | "transaction" | "cluster";
  relatedTransactions: string[];
  rulesTriggered: string[];
  riskScores: {
    fraud: number;
    aml: number;
    unified: number;
  };
  cumulativeAmount: number;
  transactionCount: number;
  rollingWindow: RollingWindowName;
  explanation: string;
  evidence: string[];
  suggestedAction: string;
  assignedAnalyst?: string;
  status: AmlAlertStatus;
  serviceLevelDeadline: string;
  relatedAlerts: string[];
  relatedCases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AmlInvestigation {
  id: string;
  alertId: string;
  owner: string;
  priority: RiskLevel;
  hypothesis: string;
  status: "open" | "mlro_review" | "closed";
  linkedEntities: string[];
  linkedTransactions: string[];
  sourceOfFundsAnalysis: string;
  sourceOfWealthAnalysis: string;
  customerExplanation?: string;
  findings: string[];
  recommendedAction: string;
  mlroDecision?: string;
  closureReason?: string;
  evidenceExportReady: boolean;
  timeline: Array<{ at: string; actor: string; action: string; detail: string }>;
  evidence: Array<{ id: string; type: string; label: string; confidence: number }>;
  auditHistory: AuditEvent[];
}

export interface SarDraft {
  id: string;
  caseId: string;
  subjectIds: string[];
  businessIds: string[];
  accountIds: string[];
  walletIds: string[];
  transactionChronology: string[];
  totalSuspiciousValue: number;
  suspicionIndicators: string[];
  reasonForSuspicion: string;
  paymentCorridors: string[];
  sourceOfFundsConcerns: string[];
  relatedEntities: string[];
  supportingEvidence: string[];
  internalReferences: string[];
  glossaryCategories: string[];
  investigator: string;
  mlroReviewStatus: SarStatus;
  narrative: string;
  aiGenerated: boolean;
  tippingOffControls: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
}

export interface AmlOverviewMetric {
  label: string;
  value: number;
  format: "number" | "currency" | "percent" | "minutes";
  risk?: RiskLevel;
}

export interface AmlChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  risk?: RiskLevel;
}

export interface AmlOverview {
  metrics: AmlOverviewMetric[];
  alertVolumeOverTime: AmlChartPoint[];
  riskDistribution: AmlChartPoint[];
  transactionValueByRisk: AmlChartPoint[];
  microtransactionClustersOverTime: AmlChartPoint[];
  fanInActivity: AmlChartPoint[];
  fanOutActivity: AmlChartPoint[];
  highRiskCorridors: AmlChartPoint[];
  ruleTriggerFrequency: AmlChartPoint[];
  alertOutcomes: AmlChartPoint[];
  investigationWorkload: AmlChartPoint[];
  customerRiskChanges: AmlChartPoint[];
  businessRiskChanges: AmlChartPoint[];
  highestRiskPaymentCorridors: string[];
  mostTriggeredScenarios: string[];
  providerStatuses: Array<{ provider: string; status: ScreeningResultStatus; detail: string }>;
  scenarioCoverage: string[];
}

export interface AmlWorkspaceSnapshot {
  overview: AmlOverview;
  transactions: AmlTransaction[];
  microtransactionClusters: MicrotransactionCluster[];
  customers: CustomerKycProfile[];
  businesses: BusinessKybProfile[];
  screeningChecks: ScreeningCheck[];
  rules: AmlRule[];
  alerts: AmlAlert[];
  investigations: AmlInvestigation[];
  sarDrafts: SarDraft[];
  audit: AuditEvent[];
  relationshipGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActorContext {
  actor: string;
  role: UserRole;
}
