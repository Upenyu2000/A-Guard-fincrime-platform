import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Alert,
  AgentCapability,
  AgentRunResult,
  AgenticOperations,
  AmlCustomerRisk,
  AmlKycMandate,
  AuditEvent,
  CaseStatus,
  DisputeEvidence,
  FacilitatedTrainingOffer,
  FraudEventInput,
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
  OperatingPicture,
  OsintFinding,
  Payment,
  RiskDecision,
  RiskLevel,
  SharedDeviceInsight,
  SuggestedRule,
  UserRole,
  WorkforceImpact,
  AccountTakeoverInsight,
  DemoVideo,
  eventTypes,
} from "./domain";
import {
  accountTakeovers as seedAccountTakeovers,
  agentCapabilities as seedAgentCapabilities,
  alerts as seedAlerts,
  amlCustomers as seedAmlCustomers,
  amlKycMandate as seedAmlKycMandate,
  audit as seedAudit,
  cases as seedCases,
  demoVideo as seedDemoVideo,
  disputes as seedDisputes,
  facilitatedTraining as seedFacilitatedTraining,
  graphEdges as seedGraphEdges,
  graphNodes as seedGraphNodes,
  heatmap as seedHeatmap,
  institutions as seedInstitutions,
  learning as seedLearning,
  learningPaths as seedLearningPaths,
  lowHighPatterns as seedLowHighPatterns,
  merchantInsights as seedMerchantInsights,
  metrics as seedMetrics,
  osintFindings as seedOsintFindings,
  payments as seedPayments,
  recentAgentRuns as seedRecentAgentRuns,
  sharedDeviceInsights as seedSharedDeviceInsights,
  suggestedRules as seedSuggestedRules,
  typologies as seedTypologies,
  workforceImpact as seedWorkforceImpact,
} from "./seed-data";
import { SecurityService } from "./modules/security/security.service";

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const nowIso = () => new Date().toISOString();

@Injectable()
export class DataStoreService {
  private readonly institutions: Institution[] = structuredClone(seedInstitutions);
  private readonly typologies = structuredClone(seedTypologies);
  private readonly alerts: Alert[] = structuredClone(seedAlerts);
  private readonly payments: Payment[] = structuredClone(seedPayments);
  private readonly cases: InvestigationCase[] = structuredClone(seedCases);
  private readonly graphNodes: GraphNode[] = structuredClone(seedGraphNodes);
  private readonly graphEdges: GraphEdge[] = structuredClone(seedGraphEdges);
  private readonly heatmap: HeatmapPoint[] = structuredClone(seedHeatmap);
  private readonly amlCustomers: AmlCustomerRisk[] = structuredClone(seedAmlCustomers);
  private readonly amlKycMandate: AmlKycMandate = structuredClone(seedAmlKycMandate);
  private readonly audit: AuditEvent[] = structuredClone(seedAudit);
  private readonly metrics: OperatingMetrics = structuredClone(seedMetrics);
  private readonly learning: LearningState = structuredClone(seedLearning);
  private readonly agents: AgentCapability[] = structuredClone(seedAgentCapabilities);
  private readonly recentAgentRuns: AgentRunResult[] = structuredClone(seedRecentAgentRuns);
  private readonly merchantInsights: MerchantRiskInsight[] = structuredClone(seedMerchantInsights);
  private readonly sharedDevices: SharedDeviceInsight[] = structuredClone(seedSharedDeviceInsights);
  private readonly accountTakeovers: AccountTakeoverInsight[] = structuredClone(seedAccountTakeovers);
  private readonly osintFindings: OsintFinding[] = structuredClone(seedOsintFindings);
  private readonly disputes: DisputeEvidence[] = structuredClone(seedDisputes);
  private readonly lowHighPatterns: LowHighPattern[] = structuredClone(seedLowHighPatterns);
  private readonly suggestedRules: SuggestedRule[] = structuredClone(seedSuggestedRules);
  private readonly workforceImpact: WorkforceImpact = structuredClone(seedWorkforceImpact);
  private readonly demoVideo: DemoVideo = structuredClone(seedDemoVideo);
  private readonly learningPaths: LearningPath[] = structuredClone(seedLearningPaths);
  private readonly facilitatedTraining: FacilitatedTrainingOffer[] = structuredClone(seedFacilitatedTraining);

  constructor(private readonly security: SecurityService) {}

  operatingPicture(): OperatingPicture {
    const graph = this.graphSnapshot();

    return {
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(0, 12),
      payments: this.payments,
      cases: this.cases,
      institutions: this.institutions,
      typologies: this.typologies,
      heatmap: this.heatmap,
      graph,
      riskDistribution: this.riskDistribution(),
      amlCustomers: this.amlCustomers,
      amlKycMandate: this.amlKycMandate,
      learning: { ...this.learning },
      audit: this.audit.slice(0, 12),
      agenticOperations: this.agenticOperations(),
    };
  }

  agenticOperations(): AgenticOperations {
    return {
      agents: this.agents,
      recentRuns: this.recentAgentRuns.slice(0, 8),
      merchantInsights: this.merchantInsights,
      sharedDevices: this.sharedDevices.slice(0, 10),
      accountTakeovers: this.accountTakeovers,
      osintFindings: this.osintFindings,
      disputes: this.disputes,
      lowHighPatterns: this.lowHighPatterns,
      suggestedRules: this.suggestedRules,
      workforceImpact: this.workforceImpact,
      demoVideo: this.demoVideo,
      learningPaths: this.learningPaths,
      facilitatedTraining: this.facilitatedTraining,
    };
  }

  runAgent(input: { agentId?: string; prompt: string; entityName?: string }) {
    const agent = this.selectAgent(input.agentId, input.prompt);
    const normalized = input.prompt.toLowerCase();
    const generatedRule = normalized.includes("rule") ? this.suggestedRules[0] : undefined;
    const evidencePackageId = normalized.includes("dispute") || normalized.includes("visa")
      ? "ce30-package-disp-visa-3001"
      : undefined;
    const result: AgentRunResult = {
      id: `run-${randomUUID().slice(0, 8)}`,
      agentId: agent.id,
      prompt: input.prompt,
      status: agent.humanReviewRequired ? "needs_review" : "ready",
      confidence: this.confidenceForPrompt(normalized),
      completedAt: nowIso(),
      summary: this.agentSummary(normalized, input.entityName),
      findings: this.agentFindings(normalized, input.entityName),
      recommendedActions: this.agentActions(normalized),
      generatedRule,
      evidencePackageId,
    };

    agent.lastRunAt = result.completedAt;
    agent.status = result.status;
    this.recentAgentRuns.unshift(result);
    this.workforceImpact.manualHoursSavedMonthly += 6;
    this.workforceImpact.monthlyCostAvoidance += 940;
    this.audit.unshift(
      this.security.audit("agentic-ops", "admin", "agent.run.completed", result.id, {
        agentId: agent.id,
        confidence: result.confidence,
      }),
    );

    return result;
  }

  osintSearch(entityName: string) {
    const existing = this.osintFindings.find(
      (item) => item.entityName.toLowerCase() === entityName.toLowerCase(),
    );
    if (existing) return existing;

    const finding: OsintFinding = {
      entityName,
      riskLevel: "medium",
      sourcesChecked: ["business registry", "domain search", "adverse media", "open web"],
      findings: [
        "No direct sanctions match found in the simulated source set.",
        "Domain and business profile need ownership validation before approval.",
      ],
      adverseMediaSignals: ["No high-confidence adverse media in simulated sources."],
      ownershipSignals: ["Beneficial owner verification required."],
      recommendedAction: "Run EDD workflow if transaction volume or geography risk increases.",
      completedAt: nowIso(),
    };
    this.osintFindings.unshift(finding);
    return finding;
  }

  trainingAcademy() {
    return {
      demoVideo: this.demoVideo,
      learningPaths: this.learningPaths,
      facilitatedTraining: this.facilitatedTraining,
      workforceImpact: this.workforceImpact,
    };
  }

  ingestEvent(event: FraudEventInput, decision: RiskDecision) {
    const eventId = event.event_id ?? `evt-${randomUUID().slice(0, 8)}`;
    const subjectHash = this.security.anonymizeEntity("usr", event.user_id);
    const institution =
      this.institutions.find((item) => item.id === event.institution_id) ?? this.institutions[0]!;
    const location = this.locationFor(event.country);

    this.metrics.eventsPerMinute = Math.round(this.metrics.eventsPerMinute + 4 + Math.random() * 36);
    this.metrics.decisionLatencyMs = Math.round(
      this.metrics.decisionLatencyMs * 0.85 + decision.latency_ms * 0.15,
    );

    if (decision.risk_level === "high" || decision.risk_level === "critical") {
      const alert: Alert = {
        id: `alt-${randomUUID().slice(0, 8)}`,
        eventId,
        title: this.titleFor(event, decision),
        severity: decision.risk_level,
        institution: institution.name,
        amount: event.amount ?? 0,
        currency: event.currency ?? "USD",
        subjectHash,
        decision: decision.decision,
        reasons: decision.reasons,
        location,
        createdAt: nowIso(),
      };

      this.alerts.unshift(alert);
      this.bumpHeatmap(location.city, decision.risk_score);
      this.updateGraph(event, decision, subjectHash);

      if (decision.decision === "block") {
        this.metrics.blockedValue += event.amount ?? 0;
      }

      if (decision.risk_level === "critical") {
        this.createCaseFromAlert(alert, event, decision);
      }

      return { eventId, alert };
    }

    return { eventId, alert: null };
  }

  recallPayment(id: string, actor: string, role: UserRole) {
    const payment = this.payments.find((item) => item.id === id);
    if (!payment) throw new NotFoundException(`Payment ${id} was not found.`);
    if (!payment.recallAvailable) {
      return { payment, message: "Recall window is already closed." };
    }

    payment.status = "recalled";
    payment.recallAvailable = false;
    payment.updatedAt = nowIso();
    payment.route = payment.route.map((hop, index) =>
      index === payment.route.length - 1
        ? { ...hop, status: "recalled", timestamp: nowIso(), risk: Math.max(hop.risk, 90) }
        : hop,
    );
    payment.riskSignals = [...new Set([...payment.riskSignals, "recall instruction sent"])];
    this.metrics.recalledValue += payment.amount;
    this.audit.unshift(
      this.security.audit(actor, role, "payment.recall.requested", payment.id, {
        amount: payment.amount,
        currency: payment.currency,
      }),
    );

    return { payment, message: "Stop and recall instruction broadcast to route participants." };
  }

  updateCaseStatus(id: string, status: CaseStatus, actor: string, role: UserRole) {
    const investigationCase = this.caseById(id);
    investigationCase.status = status;
    investigationCase.updatedAt = nowIso();
    investigationCase.timeline.unshift({
      at: nowIso(),
      actor,
      action: "status_update",
      detail: `Case moved to ${status}.`,
    });
    this.audit.unshift(this.security.audit(actor, role, "case.status.updated", id, { status }));
    return investigationCase;
  }

  caseById(id: string) {
    const investigationCase = this.cases.find((item) => item.id === id);
    if (!investigationCase) throw new NotFoundException(`Case ${id} was not found.`);
    return investigationCase;
  }

  copilot(caseId: string) {
    const investigationCase = this.caseById(caseId);
    const relatedNodes = this.graphNodes.filter((node) => investigationCase.entities.includes(node.id));
    const relatedEdges = this.graphEdges.filter(
      (edge) =>
        investigationCase.entities.includes(edge.source) || investigationCase.entities.includes(edge.target),
    );

    return {
      caseId,
      summary: `${investigationCase.title} has ${investigationCase.lossExposure.toLocaleString()} exposure, ${investigationCase.recoveryPotential.toLocaleString()} estimated recovery potential, and ${investigationCase.priority} priority based on graph, payment, and consortium evidence.`,
      timeline: investigationCase.timeline,
      evidenceGraph: {
        nodes: relatedNodes,
        edges: relatedEdges,
      },
      suggestedActions: investigationCase.nextActions,
      sarDraft: investigationCase.sarDraft,
      confidence: Math.round(
        investigationCase.evidence.reduce((sum, item) => sum + item.confidence, 0) /
          Math.max(investigationCase.evidence.length, 1),
      ),
    };
  }

  chat(caseId: string, prompt: string) {
    const investigationCase = this.caseById(caseId);
    const normalized = prompt.toLowerCase();
    if (normalized.includes("why") || normalized.includes("flagged")) {
      return {
        answer: `The case was flagged because ${investigationCase.evidence
          .map((item) => item.label.toLowerCase())
          .join(", ")}. The strongest next control is: ${investigationCase.nextActions[0]}.`,
        citations: investigationCase.evidence.map((item) => item.id),
      };
    }

    if (normalized.includes("link") || normalized.includes("entity")) {
      return {
        answer: `Linked entities are ${investigationCase.entities.join(", ")}. The graph highlights shared devices, accounts, transaction route exposure, and suspicious merchant connectivity.`,
        citations: ["identity_graph", "payment_route"],
      };
    }

    if (normalized.includes("sar") || normalized.includes("report")) {
      return {
        answer: investigationCase.sarDraft,
        citations: ["sar_draft", "case_timeline"],
      };
    }

    return {
      answer: `${investigationCase.title} is ${investigationCase.status}. Focus on payment recoverability, consortium corroboration, and customer containment before closure.`,
      citations: ["case_summary"],
    };
  }

  recordFeedback(input: {
    caseId: string;
    label: "confirmed_fraud" | "false_positive" | "recovered" | "needs_more_review";
    analyst: string;
    notes: string;
  }) {
    const investigationCase = this.caseById(input.caseId);
    this.learning.labelledCases += 1;
    this.learning.feedbackQueue += 1;

    if (input.label === "false_positive") {
      this.learning.falsePositiveRate = Math.max(3.2, this.learning.falsePositiveRate - 0.05);
      this.metrics.falsePositiveReduction += 0.08;
    }

    if (input.label === "recovered") {
      this.metrics.recoveryRate = Math.min(96, this.metrics.recoveryRate + 0.12);
      investigationCase.status = "recovered";
    }

    investigationCase.timeline.unshift({
      at: nowIso(),
      actor: input.analyst,
      action: "feedback_label",
      detail: `${input.label}: ${input.notes}`,
    });
    investigationCase.updatedAt = nowIso();

    this.audit.unshift(
      this.security.audit(input.analyst, "analyst", "learning.feedback.recorded", input.caseId, {
        label: input.label,
      }),
    );

    return {
      learning: this.learning,
      case: investigationCase,
      retrainingQueued: this.learning.feedbackQueue >= 25,
    };
  }

  consortiumPackage(alertId: string) {
    const alert = this.alerts.find((item) => item.id === alertId);
    if (!alert) throw new NotFoundException(`Alert ${alertId} was not found.`);

    return this.security.encryptForConsortium({
      alertId: alert.id,
      subjectHash: alert.subjectHash,
      severity: alert.severity,
      reasons: alert.reasons,
      institutionTrust: this.institutions.find((item) => item.name === alert.institution)?.trustScore ?? 75,
      createdAt: alert.createdAt,
    });
  }

  generateSyntheticEvent(): FraudEventInput {
    const eventType = pick([...eventTypes]);
    const institution = pick(this.institutions);
    const location = pick(this.heatmap);
    const criticalBias = Math.random() > 0.56;
    const amount = eventType === "transaction" ? Math.round(700 + Math.random() * (criticalBias ? 190_000 : 42_000)) : undefined;

    return {
      event_id: `evt-${randomUUID().slice(0, 8)}`,
      event_type: eventType,
      user_id: `user-${Math.round(Math.random() * 9000)}`,
      institution_id: institution.id,
      amount,
      currency: "USD",
      account_id: `acct-${Math.round(Math.random() * 9000)}`,
      device_id: `dev-${Math.round(Math.random() * 9000)}`,
      beneficiary_id: `ben-${Math.round(Math.random() * 9000)}`,
      ip_address: `198.51.100.${Math.round(Math.random() * 200)}`,
      country: location.country,
      channel: pick<"mobile" | "web" | "api" | "branch">(["mobile", "web", "api", "branch"]),
      signals: {
        amount_zscore: criticalBias ? 4.8 + Math.random() * 2.2 : 0.8 + Math.random() * 2.3,
        velocity_5m: criticalBias ? 5 + Math.round(Math.random() * 6) : Math.round(Math.random() * 4),
        velocity_24h: criticalBias ? 18 + Math.round(Math.random() * 12) : 3 + Math.round(Math.random() * 12),
        device_age_hours: criticalBias ? Math.random() * 3 : 12 + Math.random() * 200,
        device_reputation: criticalBias ? 62 + Math.random() * 34 : 8 + Math.random() * 45,
        ip_risk: criticalBias ? 68 + Math.random() * 24 : 10 + Math.random() * 42,
        geo_velocity_kmh: criticalBias ? 820 + Math.random() * 1600 : Math.random() * 420,
        account_age_days: criticalBias ? Math.round(Math.random() * 11) : 40 + Math.round(Math.random() * 1200),
        email_risk: criticalBias ? 67 + Math.random() * 27 : Math.random() * 41,
        phone_risk: criticalBias ? 54 + Math.random() * 32 : Math.random() * 38,
        behavior_deviation: criticalBias ? 72 + Math.random() * 22 : 8 + Math.random() * 39,
        beneficiary_risk: criticalBias ? 76 + Math.random() * 20 : 8 + Math.random() * 45,
        graph_risk: criticalBias ? 70 + Math.random() * 25 : 12 + Math.random() * 44,
        consortium_hits: criticalBias ? 1 + Math.round(Math.random() * 3) : Math.random() > 0.92 ? 1 : 0,
        blacklist_confidence: criticalBias ? 58 + Math.random() * 37 : Math.random() * 35,
        aml_risk: criticalBias ? 54 + Math.random() * 38 : Math.random() * 42,
        sanctions_hit: criticalBias && Math.random() > 0.92,
        payment_delay_seconds: criticalBias ? 420 + Math.random() * 900 : Math.random() * 180,
        failed_logins_10m: eventType === "login" && criticalBias ? 4 + Math.round(Math.random() * 6) : 0,
      },
    };
  }

  private selectAgent(agentId: string | undefined, prompt: string): AgentCapability {
    if (agentId) {
      const selected = this.agents.find((item) => item.id === agentId);
      if (selected) return selected;
    }

    const normalized = prompt.toLowerCase();
    if (normalized.includes("osint") || normalized.includes("entity")) {
      return this.agents.find((item) => item.id === "agent-osint") ?? this.agents[0]!;
    }
    if (normalized.includes("dispute") || normalized.includes("visa") || normalized.includes("compelling")) {
      return this.agents.find((item) => item.id === "agent-dispute") ?? this.agents[0]!;
    }
    if (normalized.includes("rule")) {
      return this.agents.find((item) => item.id === "agent-rule-assistant") ?? this.agents[0]!;
    }
    if (normalized.includes("device") || normalized.includes("graph") || normalized.includes("collusion")) {
      return this.agents.find((item) => item.id === "agent-graph-analyst") ?? this.agents[0]!;
    }
    if (normalized.includes("account takeover") || normalized.includes("aml")) {
      return this.agents.find((item) => item.id === "agent-aml-ops") ?? this.agents[0]!;
    }
    return this.agents.find((item) => item.id === "agent-data-analyst") ?? this.agents[0]!;
  }

  private confidenceForPrompt(prompt: string) {
    if (prompt.includes("compelling") || prompt.includes("visa")) return 91;
    if (prompt.includes("collusion") || prompt.includes("shared users")) return 89;
    if (prompt.includes("account takeover")) return 86;
    if (prompt.includes("rule")) return 84;
    return 82;
  }

  private agentSummary(prompt: string, entityName?: string) {
    if (prompt.includes("compelling") || prompt.includes("visa")) {
      return "One Visa dispute qualifies for Compelling Evidence 3.0 with three matching historical transactions and consistent device, IP, login, and address evidence.";
    }
    if (prompt.includes("dormant") || prompt.includes("spike")) {
      return "Dormant merchant analysis found four merchants that were inactive for 60+ days and now show abnormal session spikes, with Velo Digital Goods leading at 870 percent.";
    }
    if (prompt.includes("account takeover")) {
      return "The last 30 days contain three high-risk account takeover candidates with impossible travel, new devices, session changes, and payout or beneficiary updates.";
    }
    if (prompt.includes("low-value") || prompt.includes("high-value")) {
      return "Three users followed low-value probing transactions at one merchant with high-value purchases at another merchant within 12 hours.";
    }
    if (prompt.includes("rule")) {
      return "A rule has been generated for merchants under 90 days old with no acquiring transactions and operator devices reused by more than five accounts.";
    }
    if (prompt.includes("device")) {
      return "Top shared devices are concentrated across Lagos, Accra, Nairobi, Johannesburg, and Casablanca, with proxy, emulator, and bot-navigation signals.";
    }
    if (prompt.includes("osint")) {
      return `OSINT review for ${entityName ?? "the entity"} found registry, domain, web, and adverse-media signals that should be reviewed through EDD.`;
    }
    return "Agent analysis completed across fraud, AML, merchant, device, dispute, and case data with recommended next actions.";
  }

  private agentFindings(prompt: string, entityName?: string) {
    if (prompt.includes("compelling") || prompt.includes("visa")) {
      return this.disputes.map((item) =>
        item.qualifiesForVisaCE30
          ? `${item.disputeId} qualifies with ${item.compellingTransactions.length} compelling transactions.`
          : `${item.disputeId} does not qualify; insufficient matching prior transactions.`,
      );
    }
    if (prompt.includes("account takeover")) {
      return this.accountTakeovers.map(
        (item) => `${item.userId}: score ${item.riskScore}, ${item.last30DaySignals.join(", ")}.`,
      );
    }
    if (prompt.includes("low-value") || prompt.includes("high-value")) {
      return this.lowHighPatterns.map(
        (item) =>
          `${item.userId}: ${item.lowValueMerchant} ${item.lowValueAmount} to ${item.highValueMerchant} ${item.highValueAmount} in ${item.elapsedHours}h.`,
      );
    }
    if (prompt.includes("osint")) {
      return this.osintSearch(entityName ?? "Velo Digital Goods").findings;
    }
    if (prompt.includes("rule")) {
      return this.suggestedRules.map(
        (item) => `${item.name}: ${item.logic}. Expected fire rate ${item.expectedFireRate}%, false-positive reduction ${item.expectedFalsePositiveReduction}%.`,
      );
    }
    if (prompt.includes("device")) {
      return this.sharedDevices.slice(0, 4).map(
        (item) =>
          `${item.deviceId}: ${item.sharedUsers} users, ${item.locations.map((location) => location.city).join(", ")}, signals ${item.sessionRiskSignals.join(", ")}.`,
      );
    }
    return this.merchantInsights.map(
      (item) =>
        `${item.merchantName}: shared users ${item.sharedUsers}, dormant ${item.dormantDays} days, spike ${item.sessionSpikePct}%, collusion score ${item.collusionScore}.`,
    );
  }

  private agentActions(prompt: string) {
    if (prompt.includes("rule")) {
      return ["Review the generated rule in staging.", "Backtest against the last 90 days.", "Deploy in monitor mode before enforcement."];
    }
    if (prompt.includes("compelling") || prompt.includes("visa")) {
      return ["Submit CE 3.0 package for qualifying disputes.", "Keep non-qualifying disputes in manual review.", "Feed win/loss outcomes into the learning loop."];
    }
    if (prompt.includes("account takeover")) {
      return ["Revoke risky sessions.", "Hold high-risk payouts.", "Require assisted reverification for affected users."];
    }
    if (prompt.includes("osint")) {
      return ["Attach OSINT summary to EDD case.", "Validate beneficial ownership.", "Restrict settlement until review completes."];
    }
    return ["Open linked case cluster.", "Apply step-up controls to high-risk merchants.", "Share anonymised intelligence with trusted consortium partners."];
  }

  private createCaseFromAlert(alert: Alert, event: FraudEventInput, decision: RiskDecision) {
    const caseId = `case-${randomUUID().slice(0, 8)}`;
    const investigationCase: InvestigationCase = {
      id: caseId,
      title: alert.title,
      status: "new",
      priority: decision.risk_level,
      assignee: pick(["Amara Okafor", "Thabo Mbeki", "Nadia Mensah", "Laila Hassan"]),
      institution: alert.institution,
      alertId: alert.id,
      lossExposure: event.amount ?? Math.round(12_000 + Math.random() * 90_000),
      recoveryPotential: Math.round((event.amount ?? 40_000) * 0.72),
      entities: [alert.subjectHash, event.device_id ?? "device_unknown", event.account_id ?? "account_unknown"].filter(Boolean),
      timeline: [
        {
          at: nowIso(),
          actor: "case-management-service",
          action: "auto_create",
          detail: `Critical risk case created from ${alert.id}.`,
        },
        {
          at: nowIso(),
          actor: "fraud-engine-service",
          action: "decision",
          detail: `${decision.decision} decision with score ${decision.risk_score}.`,
        },
      ],
      evidence: decision.explainability.top_factors.map((factor, index) => ({
        id: `ev-${caseId}-${index}`,
        type: factor.feature,
        label: factor.evidence,
        confidence: clamp(72 + Math.abs(factor.impact) * 0.25),
      })),
      nextActions: [
        "Freeze outbound movement for linked accounts.",
        "Check recall eligibility across payment route.",
        "Share encrypted alert envelope with trusted consortium institutions.",
      ],
      sarDraft: `A critical African Guard decision indicates likely fraud for anonymised subject ${alert.subjectHash}. Key drivers include ${decision.reasons.join(", ")}. The event should be reviewed for suspicious activity reporting and recovery action.`,
      updatedAt: nowIso(),
    };

    this.cases.unshift(investigationCase);
    this.audit.unshift(
      this.security.audit("system", "admin", "case.auto_created", caseId, {
        alertId: alert.id,
        score: decision.risk_score,
      }),
    );
  }

  private riskDistribution() {
    const counts: Record<RiskLevel, number> = {
      low: 13284,
      medium: 3842,
      high: 1127,
      critical: 219,
    };
    for (const alert of this.alerts) {
      counts[alert.severity] += 1;
    }

    return [
      { level: "low" as const, count: counts.low, color: "#22c55e" },
      { level: "medium" as const, count: counts.medium, color: "#f59e0b" },
      { level: "high" as const, count: counts.high, color: "#fb7185" },
      { level: "critical" as const, count: counts.critical, color: "#a855f7" },
    ];
  }

  private locationFor(country?: string) {
    return this.heatmap.find((item) => item.country === country) ?? pick(this.heatmap);
  }

  private bumpHeatmap(city: string, score: number) {
    const point = this.heatmap.find((item) => item.city === city);
    if (!point) return;
    point.alerts += 1;
    point.risk = Math.round(point.risk * 0.82 + score * 0.18);
  }

  private graphDisplayKey(node: Pick<GraphNode, "type" | "label">) {
    return `${node.type}:${node.label.trim().toLowerCase()}`;
  }

  private findGraphNode(type: GraphNode["type"], id: string, label: string) {
    return (
      this.graphNodes.find((node) => node.id === id) ??
      this.graphNodes.find((node) => this.graphDisplayKey(node) === this.graphDisplayKey({ type, label }))
    );
  }

  private upsertGraphEdge(
    source: string,
    target: string,
    relationship: GraphEdge["relationship"],
    weight: number,
  ) {
    if (source === target) return;
    const existing = this.graphEdges.find(
      (edge) => edge.source === source && edge.target === target && edge.relationship === relationship,
    );

    if (existing) {
      existing.weight = Math.max(existing.weight, weight);
      return;
    }

    this.graphEdges.push({
      id: `edge-${randomUUID().slice(0, 8)}`,
      source,
      target,
      relationship,
      weight,
    });
  }

  private graphSnapshot() {
    const nodesByKey = new Map<string, GraphNode>();
    const retainedIdById = new Map<string, string>();

    for (const node of this.graphNodes) {
      const key = this.graphDisplayKey(node);
      const existing = nodesByKey.get(key);
      if (!existing) {
        nodesByKey.set(key, { ...node });
        retainedIdById.set(node.id, node.id);
        continue;
      }

      existing.risk = Math.max(existing.risk, node.risk);
      retainedIdById.set(node.id, existing.id);
    }

    const edgesByKey = new Map<string, GraphEdge>();
    for (const edge of this.graphEdges) {
      const source = retainedIdById.get(edge.source);
      const target = retainedIdById.get(edge.target);
      if (!source || !target || source === target) continue;

      const key = `${source}:${target}:${edge.relationship}`;
      const existing = edgesByKey.get(key);
      if (existing) {
        existing.weight = Math.max(existing.weight, edge.weight);
        continue;
      }

      edgesByKey.set(key, { ...edge, source, target });
    }

    return {
      nodes: [...nodesByKey.values()],
      edges: [...edgesByKey.values()],
    };
  }

  private updateGraph(event: FraudEventInput, decision: RiskDecision, subjectHash: string) {
    let subjectNode = this.findGraphNode("user", subjectHash, "User hash");
    if (!subjectNode) {
      subjectNode = {
        id: subjectHash,
        type: "user",
        label: "User hash",
        risk: decision.risk_score,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      };
      this.graphNodes.push(subjectNode);
    } else {
      subjectNode.risk = Math.round(subjectNode.risk * 0.7 + decision.risk_score * 0.3);
    }

    if (event.device_id) {
      const deviceLabel = event.device_id === "dev_a4fd" ? "Device A4FD" : "Device hash";
      let deviceNode = this.findGraphNode("device", event.device_id, deviceLabel);
      if (!deviceNode) {
        deviceNode = {
          id: event.device_id,
          type: "device",
          label: deviceLabel,
          risk: decision.component_scores.behavioural_profile,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
        };
        this.graphNodes.push(deviceNode);
      } else {
        deviceNode.risk = Math.round(
          deviceNode.risk * 0.7 + decision.component_scores.behavioural_profile * 0.3,
        );
      }

      this.upsertGraphEdge(
        subjectNode.id,
        deviceNode.id,
        "used_on",
        decision.component_scores.behavioural_profile / 100,
      );
    }
  }

  private titleFor(event: FraudEventInput, decision: RiskDecision) {
    if (event.event_type === "transaction") return `${decision.risk_level} transaction interdiction`;
    if (event.event_type === "login") return `${decision.risk_level} login takeover pattern`;
    if (event.event_type === "beneficiary_creation") return `${decision.risk_level} beneficiary risk propagation`;
    if (event.event_type === "device_change") return `${decision.risk_level} device intelligence alert`;
    return `${decision.risk_level} account update alert`;
  }
}
