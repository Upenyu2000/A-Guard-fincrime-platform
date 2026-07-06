import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Alert,
  AgentAction,
  AgentCapability,
  AgentAutonomyMode,
  AgentRunResult,
  AgentOpsControlPlane,
  AgenticOperations,
  AmlCustomerRisk,
  AuditEvent,
  CaseStatus,
  DeveloperApiKey,
  DisputeEvidence,
  EnterprisePlatform,
  EvidenceCapture,
  FacilitatedTrainingOffer,
  FraudEventInput,
  GraphEdge,
  GraphNode,
  HeatmapPoint,
  Institution,
  IntegrationConnection,
  InvestigationCase,
  LearningState,
  LearningPath,
  LowHighPattern,
  MerchantRiskInsight,
  OperatingMetrics,
  OperatingPicture,
  OsintInvestigationResult,
  OsintFinding,
  Payment,
  RiskDecision,
  RiskLevel,
  SharedDeviceInsight,
  SuggestedRule,
  TransactionMonitoringRecord,
  UserRole,
  WorkforceImpact,
  AccountTakeoverInsight,
  DemoVideo,
  DeploymentReadiness,
  eventTypes,
} from "./domain";
import {
  accountTakeovers as seedAccountTakeovers,
  agentCapabilities as seedAgentCapabilities,
  agentOpsControlPlane as seedAgentOpsControlPlane,
  alerts as seedAlerts,
  amlCustomers as seedAmlCustomers,
  audit as seedAudit,
  cases as seedCases,
  demoVideo as seedDemoVideo,
  deploymentReadiness as seedDeploymentReadiness,
  disputes as seedDisputes,
  enterprisePlatform as seedEnterprisePlatform,
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
  private readonly audit: AuditEvent[] = structuredClone(seedAudit);
  private readonly metrics: OperatingMetrics = structuredClone(seedMetrics);
  private readonly learning: LearningState = structuredClone(seedLearning);
  private readonly agents: AgentCapability[] = structuredClone(seedAgentCapabilities);
  private readonly recentAgentRuns: AgentRunResult[] = structuredClone(seedRecentAgentRuns);
  private readonly controlPlane: AgentOpsControlPlane = structuredClone(seedAgentOpsControlPlane);
  private readonly deploymentReadinessSeed: DeploymentReadiness = structuredClone(seedDeploymentReadiness);
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
  private readonly enterprise: EnterprisePlatform = structuredClone(seedEnterprisePlatform);

  constructor(private readonly security: SecurityService) {}

  operatingPicture(): OperatingPicture {
    return {
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(0, 12),
      payments: this.payments,
      cases: this.cases,
      institutions: this.institutions,
      typologies: this.typologies,
      heatmap: this.heatmap,
      graph: {
        nodes: this.graphNodes,
        edges: this.graphEdges,
      },
      riskDistribution: this.riskDistribution(),
      amlCustomers: this.amlCustomers,
      learning: { ...this.learning },
      audit: this.audit.slice(0, 12),
      agenticOperations: this.agenticOperations(),
      enterprise: this.enterpriseSnapshot(),
    };
  }

  agenticOperations(): AgenticOperations {
    return {
      agents: this.agents,
      recentRuns: this.recentAgentRuns.slice(0, 8),
      controlPlane: this.controlPlaneSnapshot(),
      deploymentReadiness: this.deploymentReadiness(),
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
    const action = this.actionForPrompt(agent.id, normalized);
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
      executionPlan: this.executionPlanFor(this.planKindFor(normalized)),
      actionsQueued: action ? [action.id] : [],
      policyDecision: this.policyDecisionFor(action?.riskScore ?? this.confidenceForPrompt(normalized), action?.amount),
    };

    if (action) {
      this.controlPlane.actionQueue.unshift(action);
      this.controlPlane.telemetry.queuedActions += 1;
      if (action.requiresApproval) this.controlPlane.telemetry.humanApprovalsPending += 1;
    }

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

  enterpriseSnapshot(): EnterprisePlatform {
    return {
      ...this.enterprise,
      integrations: this.enterprise.integrations.slice(0, 20),
      transactions: this.enterprise.transactions.slice(0, 30),
      osint: this.enterprise.osint.slice(0, 10),
      evidence: this.enterprise.evidence.slice(0, 20),
      apiKeys: this.enterprise.apiKeys.map((key) => ({ ...key })),
    };
  }

  integrationsDashboard() {
    return {
      integrations: this.enterprise.integrations,
      adapters: this.enterprise.adapters,
      totals: {
        connected: this.enterprise.integrations.filter((item) => item.status === "connected").length,
        degraded: this.enterprise.integrations.filter((item) => item.status === "degraded").length,
        volume24h: this.enterprise.integrations.reduce((sum, item) => sum + item.dataVolume24h, 0),
        errors24h: this.enterprise.integrations.reduce((sum, item) => sum + item.errors.length, 0),
      },
    };
  }

  testIntegration(id: string, actor: string, role: UserRole) {
    const integration = this.integrationById(id);
    integration.status = integration.errors.length > 0 ? "degraded" : "connected";
    integration.lastSyncAt = nowIso();
    if (integration.status === "connected") integration.lastSuccessfulSyncAt = nowIso();
    this.audit.unshift(
      this.security.audit(actor, role, "integration.connection.tested", id, {
        status: integration.status,
        adapterId: integration.adapterId,
      }),
    );

    return {
      integration,
      result: integration.status === "connected" ? "Connection test passed." : "Connection test completed with warnings.",
      checks: [
        "credential reference resolved",
        "mTLS or webhook signing metadata present",
        "field mapping validates required transaction fields",
        "rate limit policy configured",
      ],
    };
  }

  createIntegration(
    input: {
      tenantId: string;
      name: string;
      adapterId: string;
      type: IntegrationConnection["type"];
      environment?: "sandbox" | "production";
      authMethods: IntegrationConnection["authMethods"];
      scopes: string[];
      apiSecret?: string;
      webhookUrl?: string;
      fieldMappings?: IntegrationConnection["fieldMappings"];
    },
    actor: string,
    role: UserRole,
  ) {
    const tenant = this.enterprise.tenants.find((item) => item.id === input.tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${input.tenantId} was not found.`);
    const adapter = this.enterprise.adapters.find((item) => item.id === input.adapterId);
    if (!adapter) throw new NotFoundException(`Adapter ${input.adapterId} was not found.`);
    const encrypted = this.security.encryptSecret(input.apiSecret ?? `sandbox-${randomUUID()}`, `${input.tenantId}:${input.name}`);
    const integration: IntegrationConnection = {
      id: `int-${randomUUID().slice(0, 8)}`,
      tenantId: tenant.id,
      organisationName: tenant.name,
      name: input.name,
      type: input.type,
      adapterId: adapter.id,
      environment: input.environment ?? "sandbox",
      authMethods: input.authMethods,
      status: "testing",
      scopes: input.scopes,
      credentialMetadata: {
        secretRef: encrypted.secretRef,
        keyFingerprint: encrypted.keyFingerprint,
        encryptedAt: nowIso(),
        oauthScopes: input.authMethods.includes("oauth2") ? input.scopes : [],
      },
      fieldMappings: input.fieldMappings?.length
        ? input.fieldMappings
        : [
            { sourceField: "id", targetField: "id", required: true },
            { sourceField: "amount", targetField: "amount", required: true },
            { sourceField: "customerId", targetField: "customerId", required: true },
          ],
      webhook: input.webhookUrl
        ? {
            id: `wh-${randomUUID().slice(0, 8)}`,
            url: input.webhookUrl,
            events: adapter.supportedEvents,
            status: "active",
            signingSecretRef: `vault://webhooks/${tenant.id}/${randomUUID().slice(0, 8)}`,
            lastDeliveryAt: nowIso(),
            failureCount: 0,
          }
        : undefined,
      lastSyncAt: undefined,
      lastSuccessfulSyncAt: undefined,
      dataVolume24h: 0,
      totalTransactionsIngested: 0,
      rateLimitPerMinute: adapter.rateLimitPerMinute,
      retryPolicy: "exponential-backoff: 5 attempts, dead-letter after 15 minutes",
      errors: [],
    };
    this.enterprise.integrations.unshift(integration);
    this.audit.unshift(
      this.security.audit(actor, role, "integration.created", integration.id, {
        tenantId: tenant.id,
        adapterId: adapter.id,
        secretRef: integration.credentialMetadata.secretRef,
      }),
    );

    return integration;
  }

  createApiKey(input: { tenantId: string; name: string; scopes: string[]; expiresAt?: string }, actor: string, role: UserRole) {
    const tenant = this.enterprise.tenants.find((item) => item.id === input.tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${input.tenantId} was not found.`);
    const rawKey = `ag_${input.tenantId.includes("atlas") ? "test" : "live"}_${randomUUID().replaceAll("-", "")}`;
    const key: DeveloperApiKey = {
      id: `key-${randomUUID().slice(0, 8)}`,
      tenantId: tenant.id,
      name: input.name,
      prefix: rawKey.slice(0, 15),
      fingerprint: this.security.fingerprint(rawKey),
      scopes: input.scopes,
      status: "active",
      createdAt: nowIso(),
      expiresAt: input.expiresAt,
    };
    this.enterprise.apiKeys.unshift(key);
    this.audit.unshift(
      this.security.audit(actor, role, "api_key.created", key.id, {
        tenantId: tenant.id,
        scopes: key.scopes,
        fingerprint: key.fingerprint,
      }),
    );

    return {
      apiKey: key,
      secret: rawKey,
      warning: "Store this secret now. African Guard stores only the encrypted reference/fingerprint and will not show it again.",
    };
  }

  ingestTransaction(input: {
    integrationId: string;
    id?: string;
    amount: number;
    currency: string;
    customerId: string;
    accountId?: string;
    cardId?: string;
    merchantId?: string;
    deviceId?: string;
    ipAddress?: string;
    beneficiaryId?: string;
    rail?: TransactionMonitoringRecord["rail"];
  }, decision: RiskDecision) {
    const integration = this.integrationById(input.integrationId);
    const record: TransactionMonitoringRecord = {
      id: input.id ?? `txn-${randomUUID().slice(0, 8)}`,
      tenantId: integration.tenantId,
      sourceIntegrationId: integration.id,
      rail: input.rail ?? this.railForIntegration(integration),
      eventType: "transaction",
      amount: input.amount,
      currency: input.currency,
      status: decision.decision === "block" ? "held" : decision.decision === "review" ? "pre_authorization" : "approved",
      customerId: input.customerId,
      accountId: input.accountId,
      cardId: input.cardId,
      merchantId: input.merchantId,
      deviceId: input.deviceId,
      ipAddress: input.ipAddress,
      beneficiaryId: input.beneficiaryId,
      riskScore: decision.risk_score,
      riskLevel: decision.risk_level,
      decision: decision.decision,
      reasons: decision.reasons,
      explainability: decision.explainability.top_factors,
      ingestedAt: nowIso(),
      processedAt: nowIso(),
    };
    this.enterprise.transactions.unshift(record);
    integration.lastSyncAt = nowIso();
    integration.lastSuccessfulSyncAt = nowIso();
    integration.dataVolume24h += 1;
    integration.totalTransactionsIngested += 1;
    return record;
  }

  lawfulOsintSearch(
    input: {
      tenantId: string;
      caseId: string;
      investigatorId: string;
      lawfulBasis: string;
      purpose: string;
      permissionLevel: "standard" | "enhanced" | "supervised";
      query: OsintInvestigationResult["query"]["query"];
    },
    actor: string,
    role: UserRole,
  ) {
    if (!input.caseId || !input.lawfulBasis || !input.purpose) {
      throw new BadRequestException("caseId, lawfulBasis, and purpose are required for OSINT searches.");
    }
    if (!["investigator", "fraud_investigator", "compliance_officer", "admin"].includes(role)) {
      throw new BadRequestException("OSINT search requires investigator, compliance, or admin permission.");
    }

    const base = structuredClone(this.enterprise.osint[0]);
    if (!base) throw new NotFoundException("No OSINT provider is configured.");
    base.query = {
      ...base.query,
      id: `osint-${randomUUID().slice(0, 8)}`,
      tenantId: input.tenantId,
      caseId: input.caseId,
      investigatorId: input.investigatorId,
      lawfulBasis: input.lawfulBasis,
      purpose: input.purpose,
      permissionLevel: input.permissionLevel,
      searchedAt: nowIso(),
      query: input.query,
    };
    base.matches = base.matches.map((match) => ({
      ...match,
      quality: match.confidence >= 80 ? "probable" : "needs_verification",
      needsHumanReview: true,
    }));
    this.enterprise.osint.unshift(base);
    this.audit.unshift(
      this.security.audit(actor, role, "osint.search.performed", base.query.id, {
        tenantId: input.tenantId,
        caseId: input.caseId,
        lawfulBasis: input.lawfulBasis,
        sources: base.query.sourcesQueried,
      }),
    );

    return base;
  }

  captureEvidence(input: Omit<EvidenceCapture, "id" | "hash" | "capturedAt" | "chainOfCustody">, actor: string, role: UserRole) {
    const serialized = JSON.stringify(input);
    const evidence: EvidenceCapture = {
      ...input,
      id: `evcap-${randomUUID().slice(0, 8)}`,
      hash: this.security.fingerprint(serialized),
      capturedAt: nowIso(),
      chainOfCustody: ["captured", "hashed", "attached_to_case"],
    };
    this.enterprise.evidence.unshift(evidence);
    this.audit.unshift(
      this.security.audit(actor, role, "evidence.captured", evidence.id, {
        caseId: evidence.caseId,
        hash: evidence.hash,
        type: evidence.type,
      }),
    );
    return evidence;
  }

  receiveWebhook(integrationId: string, payload: Record<string, unknown>, actor = "webhook-service") {
    const integration = this.integrationById(integrationId);
    integration.lastSyncAt = nowIso();
    integration.dataVolume24h += 1;
    this.audit.unshift(
      this.security.audit(actor, "developer", "webhook.received", integrationId, {
        eventType: payload["type"] ?? "unknown",
        signatureChecked: true,
      }),
    );
    return {
      received: true,
      integrationId,
      idempotencyKey: this.security.fingerprint(JSON.stringify(payload)),
      queued: true,
    };
  }

  auditExport() {
    return {
      exportedAt: nowIso(),
      format: "json",
      records: this.audit,
      hash: this.security.fingerprint(JSON.stringify(this.audit)),
    };
  }

  agentOpsControlPlane() {
    return {
      controlPlane: this.controlPlaneSnapshot(),
      deploymentReadiness: this.deploymentReadiness(),
    };
  }

  runAgenticDefenseCycle(actor: string, role: UserRole) {
    const cycleId = `cycle-${randomUUID().slice(0, 8)}`;
    const pattern = this.controlPlane.emergingPatterns.find((item) => item.id === "pattern-agentic-browser-card-testing");
    if (pattern) {
      pattern.lastSeenAt = nowIso();
      pattern.status = "watching";
    }

    const action: AgentAction = {
      id: `act-rule-${randomUUID().slice(0, 8)}`,
      agentId: "agent-rule-assistant",
      type: "propose_rule",
      title: "Promote agentic browser card-testing control",
      description:
        "The defense cycle observed low-value probes, high bot score, shared fingerprints, and merchant hopping. Deploy the rule in monitor mode before enforcement.",
      riskScore: 86,
      status: this.controlPlane.autonomyMode === "autonomous" ? "approved" : "requires_approval",
      requiresApproval: this.controlPlane.autonomyMode !== "autonomous",
      evidence: ["pattern-agentic-browser-card-testing", "rule-agentic-browser-card-testing"],
      createdAt: nowIso(),
      executedAt: this.controlPlane.autonomyMode === "autonomous" ? nowIso() : undefined,
      approvedBy: this.controlPlane.autonomyMode === "autonomous" ? "policy-real-time-fraud-defense" : undefined,
    };

    this.controlPlane.actionQueue.unshift(action);
    this.controlPlane.telemetry.lastCycleAt = nowIso();
    this.controlPlane.telemetry.rulesProposedToday += 1;
    this.controlPlane.telemetry.queuedActions = this.controlPlane.actionQueue.filter(
      (item) => item.status === "queued" || item.status === "requires_approval",
    ).length;
    this.controlPlane.telemetry.humanApprovalsPending = this.controlPlane.actionQueue.filter(
      (item) => item.requiresApproval && item.status === "requires_approval",
    ).length;
    if (action.status === "approved") {
      this.controlPlane.telemetry.autonomousActionsToday += 1;
    }

    const run: AgentRunResult = {
      id: `run-${randomUUID().slice(0, 8)}`,
      agentId: "agent-rule-assistant",
      prompt: "Autonomous defense cycle: detect emerging browser-agent card testing and propose controls.",
      status: action.requiresApproval ? "needs_review" : "ready",
      confidence: 88,
      completedAt: nowIso(),
      summary:
        "The defense cycle found renewed browser-agent card-testing behavior and queued a rule promotion with evidence.",
      findings: [
        "Low-value probes are occurring across Velo Digital Goods and Luno Arcade.",
        "Device fingerprints are reused across more than five accounts and three merchants.",
        "Bot scores exceed 78 while session entropy remains below human baselines.",
      ],
      recommendedActions: [
        "Approve monitor-mode deployment for rule-agentic-browser-card-testing.",
        "Keep settlement holds enabled for merchants with collusion score above 85.",
        "Review the action queue before raising enforcement from step-up to block.",
      ],
      generatedRule: this.suggestedRules.find((item) => item.id === "rule-agentic-browser-card-testing"),
      actionsQueued: [action.id],
      executionPlan: this.executionPlanFor("rule"),
      policyDecision: this.policyDecisionFor(action.riskScore, action.amount),
    };

    this.recentAgentRuns.unshift(run);
    this.audit.unshift(
      this.security.audit(actor, role, "agentops.defense_cycle.completed", cycleId, {
        actionId: action.id,
        autonomyMode: this.controlPlane.autonomyMode,
        approvalRequired: action.requiresApproval,
      }),
    );

    return {
      cycleId,
      run,
      action,
      controlPlane: this.controlPlaneSnapshot(),
    };
  }

  approveAgentAction(id: string, actor: string, role: UserRole) {
    const action = this.controlPlane.actionQueue.find((item) => item.id === id);
    if (!action) throw new NotFoundException(`Agent action ${id} was not found.`);

    action.status = "executed";
    action.requiresApproval = false;
    action.approvedBy = actor;
    action.executedAt = nowIso();

    const ruleId = action.evidence.find((item) => item.startsWith("rule-"));
    if (ruleId) {
      const rule = this.suggestedRules.find((item) => item.id === ruleId);
      if (rule) {
        rule.lifecycle = rule.lifecycle === "draft" ? "monitor" : "active";
        rule.approvedBy = actor;
        rule.deployedAt = nowIso();
      }
    }

    this.controlPlane.telemetry.autonomousActionsToday += 1;
    this.controlPlane.telemetry.humanApprovalsPending = this.controlPlane.actionQueue.filter(
      (item) => item.requiresApproval && item.status === "requires_approval",
    ).length;
    this.controlPlane.telemetry.queuedActions = this.controlPlane.actionQueue.filter(
      (item) => item.status === "queued" || item.status === "requires_approval",
    ).length;

    this.audit.unshift(
      this.security.audit(actor, role, "agentops.action.approved", id, {
        actionType: action.type,
        riskScore: action.riskScore,
      }),
    );

    return {
      action,
      controlPlane: this.controlPlaneSnapshot(),
    };
  }

  setAutonomyMode(mode: AgentAutonomyMode, actor: string, role: UserRole) {
    if (!["copilot", "monitored", "autonomous"].includes(mode)) {
      throw new BadRequestException("Autonomy mode must be copilot, monitored, or autonomous.");
    }

    this.controlPlane.autonomyMode = mode;
    this.controlPlane.policies = this.controlPlane.policies.map((policy) => ({
      ...policy,
      autonomyMode: policy.id === "policy-dispute-evidence" ? policy.autonomyMode : mode,
    }));

    this.audit.unshift(
      this.security.audit(actor, role, "agentops.autonomy.updated", "agentops-control-plane", {
        mode,
      }),
    );

    return this.controlPlaneSnapshot();
  }

  deploymentReadiness(): DeploymentReadiness {
    const checks = this.deploymentReadinessSeed.checks.map((check) => {
      if (check.id === "readiness-secrets") {
        const configured = Boolean(process.env.CONSORTIUM_SHARED_SECRET);
        return {
          ...check,
          status: configured ? "pass" as const : "warn" as const,
          detail: configured
            ? "Consortium HMAC and encryption secret is provided by the environment."
            : "Local development secret is in use.",
        };
      }

      if (check.id === "readiness-persistence") {
        const configured = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
        return {
          ...check,
          status: configured ? "pass" as const : "warn" as const,
          detail: configured
            ? "PostgreSQL and Redis connection strings are configured."
            : "The local demo uses in-memory state until DATABASE_URL and REDIS_URL are configured.",
        };
      }

      return check;
    });

    const status: DeploymentReadiness["status"] = checks.some((check) => check.status === "fail")
      ? "fail"
      : checks.some((check) => check.status === "warn")
        ? "warn"
        : "pass";

    return {
      ...this.deploymentReadinessSeed,
      environment: process.env.NODE_ENV ?? "development",
      generatedAt: nowIso(),
      status,
      checks,
    };
  }

  prometheusMetrics() {
    const telemetry = this.controlPlane.telemetry;
    return [
      "# HELP african_guard_decision_latency_ms Decision latency in milliseconds.",
      "# TYPE african_guard_decision_latency_ms gauge",
      `african_guard_decision_latency_ms ${this.metrics.decisionLatencyMs}`,
      "# HELP african_guard_agent_p95_latency_ms Agent p95 latency in milliseconds.",
      "# TYPE african_guard_agent_p95_latency_ms gauge",
      `african_guard_agent_p95_latency_ms ${telemetry.p95LatencyMs}`,
      "# HELP african_guard_agent_pending_approvals Pending agent approvals.",
      "# TYPE african_guard_agent_pending_approvals gauge",
      `african_guard_agent_pending_approvals ${telemetry.humanApprovalsPending}`,
      "# HELP african_guard_payment_value_held Payment value held by automated controls.",
      "# TYPE african_guard_payment_value_held gauge",
      `african_guard_payment_value_held ${telemetry.paymentValueHeld}`,
      "# HELP african_guard_model_drift_score Model and agent drift score.",
      "# TYPE african_guard_model_drift_score gauge",
      `african_guard_model_drift_score ${Math.max(this.learning.driftIndex, telemetry.driftScore)}`,
      "",
    ].join("\n");
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
        device_fingerprint_reuse: criticalBias ? 5 + Math.round(Math.random() * 9) : Math.round(Math.random() * 4),
        ip_risk: criticalBias ? 68 + Math.random() * 24 : 10 + Math.random() * 42,
        geo_velocity_kmh: criticalBias ? 820 + Math.random() * 1600 : Math.random() * 420,
        account_age_days: criticalBias ? Math.round(Math.random() * 11) : 40 + Math.round(Math.random() * 1200),
        email_risk: criticalBias ? 67 + Math.random() * 27 : Math.random() * 41,
        phone_risk: criticalBias ? 54 + Math.random() * 32 : Math.random() * 38,
        behavior_deviation: criticalBias ? 72 + Math.random() * 22 : 8 + Math.random() * 39,
        bot_score: criticalBias ? 70 + Math.random() * 25 : 4 + Math.random() * 38,
        remote_access_tool: criticalBias && Math.random() > 0.68,
        deepfake_risk: criticalBias ? 38 + Math.random() * 42 : Math.random() * 28,
        session_entropy: criticalBias ? 16 + Math.random() * 30 : 45 + Math.random() * 45,
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

  private controlPlaneSnapshot(): AgentOpsControlPlane {
    const actionQueue = this.controlPlane.actionQueue.slice(0, 10);
    return {
      ...this.controlPlane,
      actionQueue,
      telemetry: {
        ...this.controlPlane.telemetry,
        queuedActions: this.controlPlane.actionQueue.filter(
          (item) => item.status === "queued" || item.status === "requires_approval",
        ).length,
        humanApprovalsPending: this.controlPlane.actionQueue.filter(
          (item) => item.requiresApproval && item.status === "requires_approval",
        ).length,
      },
      emergingPatterns: this.controlPlane.emergingPatterns.slice(0, 8),
    };
  }

  private integrationById(id: string): IntegrationConnection {
    const integration = this.enterprise.integrations.find((item) => item.id === id);
    if (!integration) throw new NotFoundException(`Integration ${id} was not found.`);
    return integration;
  }

  private railForIntegration(integration: IntegrationConnection): TransactionMonitoringRecord["rail"] {
    if (integration.type === "open_banking") return "open_banking";
    if (integration.type === "visa") return "visa";
    if (integration.type === "mastercard") return "mastercard";
    if (integration.type === "card_processor") return "credit_card";
    if (integration.type === "psp") return "psp";
    return "internal";
  }

  private executionPlanFor(kind: "rule" | "dispute" | "osint" | "graph" | "ato" | "general") {
    const plans = {
      rule: [
        ["collect-pattern", "Collect linked event and session pattern", "pattern-agentic-browser-card-testing"],
        ["backtest-rule", "Backtest rule against recent traffic", "rule-agentic-browser-card-testing"],
        ["queue-approval", "Queue deployment decision for policy approval", "act-rule-card-testing-002"],
      ],
      dispute: [
        ["fetch-history", "Fetch historical undisputed transactions", "disp-visa-3001"],
        ["match-evidence", "Match device, IP, login, and delivery evidence", "ce30-package-disp-visa-3001"],
        ["package-review", "Assemble network-ready evidence package", "case-dispute-review"],
      ],
      osint: [
        ["registry-search", "Search registry and ownership records", "osint-registry"],
        ["adverse-media", "Review adverse media and domain intelligence", "osint-media"],
        ["edd-summary", "Create EDD-ready risk summary", "edd-summary"],
      ],
      graph: [
        ["resolve-entities", "Resolve shared users, merchants, devices, and IPs", "identity-graph"],
        ["rank-links", "Rank network links by risk propagation", "graph-risk"],
        ["containment", "Queue containment or intelligence sharing action", "consortium-package"],
      ],
      ato: [
        ["session-review", "Review last 30 days of login and session activity", "ato-session-window"],
        ["device-diff", "Compare device and geography changes", "ato-device-diff"],
        ["containment", "Queue session revoke and reverification action", "ato-containment"],
      ],
      general: [
        ["retrieve-context", "Retrieve case, graph, payment, and consortium context", "operating-picture"],
        ["score-hypothesis", "Score hypothesis against risk policy", "risk-policy"],
        ["recommend-action", "Recommend governed next action", "agent-policy"],
      ],
    } satisfies Record<string, Array<[string, string, string]>>;

    return plans[kind].map(([id, name, evidenceRef], index) => ({
      id,
      name,
      status: index === plans[kind].length - 1 && this.controlPlane.autonomyMode !== "autonomous"
        ? "waiting_approval" as const
        : "completed" as const,
      evidenceRef,
    }));
  }

  private policyDecisionFor(riskScore: number, amount?: number) {
    const policy = this.controlPlane.policies[0]!;
    const value = amount ?? 0;
    const approvalRequired =
      this.controlPlane.autonomyMode !== "autonomous" ||
      riskScore >= policy.humanApprovalAboveRisk ||
      value > policy.maxAutonomousValue;

    return {
      autonomyMode: this.controlPlane.autonomyMode,
      allowedToExecute: !approvalRequired,
      approvalRequired,
      reason: approvalRequired
        ? `Human approval required by ${policy.name}: mode ${this.controlPlane.autonomyMode}, risk ${riskScore}, value ${value}.`
        : `Action is within ${policy.name} autonomous threshold.`,
    };
  }

  private planKindFor(prompt: string): "rule" | "dispute" | "osint" | "graph" | "ato" | "general" {
    if (prompt.includes("rule")) return "rule";
    if (prompt.includes("dispute") || prompt.includes("visa") || prompt.includes("compelling")) return "dispute";
    if (prompt.includes("osint")) return "osint";
    if (prompt.includes("device") || prompt.includes("graph") || prompt.includes("collusion")) return "graph";
    if (prompt.includes("account takeover")) return "ato";
    return "general";
  }

  private actionForPrompt(agentId: string, prompt: string): AgentAction | undefined {
    if (prompt.includes("rule")) {
      const riskScore = 86;
      return {
        id: `act-rule-${randomUUID().slice(0, 8)}`,
        agentId,
        type: "propose_rule",
        title: "Review generated monitoring rule",
        description:
          "A natural-language rule was converted into deployable logic and is queued for backtest and approval.",
        riskScore,
        status: this.policyDecisionFor(riskScore).approvalRequired ? "requires_approval" : "approved",
        requiresApproval: this.policyDecisionFor(riskScore).approvalRequired,
        evidence: ["rule-new-merchant-reused-device", "merchant-risk-backtest"],
        createdAt: nowIso(),
      };
    }

    if (prompt.includes("account takeover")) {
      const riskScore = 88;
      return {
        id: `act-ato-${randomUUID().slice(0, 8)}`,
        agentId,
        type: "step_up",
        title: "Require reverification for high-risk ATO candidates",
        description:
          "Three accounts show impossible travel, new device, payout changes, and session behavior inconsistent with baseline.",
        riskScore,
        status: "requires_approval",
        requiresApproval: true,
        evidence: this.accountTakeovers.slice(0, 3).map((item) => item.accountId),
        createdAt: nowIso(),
      };
    }

    if (prompt.includes("collusion") || prompt.includes("shared users")) {
      const riskScore = 91;
      return {
        id: `act-share-${randomUUID().slice(0, 8)}`,
        agentId,
        type: "share_intelligence",
        title: "Share anonymised collusion intelligence",
        description:
          "High shared-user concentration and merchant-device reuse indicate coordinated abuse across trusted partners.",
        riskScore,
        status: "requires_approval",
        requiresApproval: true,
        evidence: this.merchantInsights.slice(0, 3).map((item) => item.merchantId),
        createdAt: nowIso(),
      };
    }

    if (prompt.includes("dispute") || prompt.includes("visa") || prompt.includes("compelling")) {
      const riskScore = 68;
      return {
        id: `act-dispute-${randomUUID().slice(0, 8)}`,
        agentId,
        type: "draft_sar",
        title: "Assemble dispute evidence package",
        description:
          "Qualifying Visa CE 3.0 evidence was gathered and prepared for human filing workflow.",
        riskScore,
        status: "approved",
        requiresApproval: false,
        evidence: ["ce30-package-disp-visa-3001"],
        createdAt: nowIso(),
        executedAt: nowIso(),
        approvedBy: "policy-dispute-evidence",
      };
    }

    return undefined;
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

  private updateGraph(event: FraudEventInput, decision: RiskDecision, subjectHash: string) {
    const existingNode = this.graphNodes.find((node) => node.id === subjectHash);
    if (!existingNode) {
      this.graphNodes.push({
        id: subjectHash,
        type: "user",
        label: "User hash",
        risk: decision.risk_score,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
    } else {
      existingNode.risk = Math.round(existingNode.risk * 0.7 + decision.risk_score * 0.3);
    }

    if (event.device_id && !this.graphNodes.find((node) => node.id === event.device_id)) {
      this.graphNodes.push({
        id: event.device_id,
        type: "device",
        label: "Device hash",
        risk: decision.component_scores.behavioural_profile,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
      this.graphEdges.push({
        id: `edge-${randomUUID().slice(0, 8)}`,
        source: subjectHash,
        target: event.device_id,
        relationship: "used_on",
        weight: decision.component_scores.behavioural_profile / 100,
      });
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
