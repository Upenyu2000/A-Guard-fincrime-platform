import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FraudEngineService } from "../fraud/fraud-engine.service";
import { SecurityService } from "../security/security.service";
import {
  AmlActionReasonDto,
  AssignAmlAlertDto,
  BatchEvaluateAmlTransactionsDto,
  CloseAmlAlertDto,
  CreateAmlRuleDto,
  CreateSarDraftDto,
  EvaluateAmlTransactionDto,
  ListAmlTransactionsQueryDto,
  PatchAmlAlertDto,
  PatchAmlRuleDto,
  ScreeningRequestDto,
} from "./dto/aml.dto";
import {
  amlAlerts as seedAlerts,
  amlAudit as seedAudit,
  amlBusinesses as seedBusinesses,
  amlCustomers as seedCustomers,
  amlRules as seedRules,
  amlTransactions as seedTransactions,
  investigations as seedInvestigations,
  relationshipGraph as seedRelationshipGraph,
  sarDrafts as seedSarDrafts,
  scenarioCoverage,
  screeningChecks as seedScreeningChecks,
  seededClusters,
} from "./aml.seed";
import {
  finraCourses,
  repositoryReviews,
  researchImplementations,
  researchPaperReviews,
} from "./aml.research";
import { MicrotransactionDetectorService } from "./microtransaction-detector.service";
import { ResearchRiskService } from "./research-risk.service";
import {
  ActorContext,
  AmlAlert,
  AmlInvestigation,
  AmlOverview,
  AmlRiskDecision,
  AmlRule,
  AmlScoreBreakdown,
  AmlTransaction,
  AmlWorkspaceSnapshot,
  BusinessKybProfile,
  CustomerKycProfile,
  MicrotransactionCluster,
  Paginated,
  RollingWindowName,
  SarDraft,
  ScreeningCheck,
} from "./aml.types";
import { AuditEvent, FraudEventInput, RiskLevel } from "../../domain";

const nowIso = () => new Date().toISOString();
const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

@Injectable()
export class AmlService {
  private readonly transactions: AmlTransaction[] = structuredClone(seedTransactions);
  private readonly customers: CustomerKycProfile[] = structuredClone(seedCustomers);
  private readonly businesses: BusinessKybProfile[] = structuredClone(seedBusinesses);
  private readonly screeningChecks: ScreeningCheck[] = structuredClone(seedScreeningChecks);
  private readonly rules: AmlRule[] = structuredClone(seedRules);
  private readonly alerts: AmlAlert[] = structuredClone(seedAlerts);
  private readonly investigations: AmlInvestigation[] = structuredClone(seedInvestigations);
  private readonly sarDrafts: SarDraft[] = structuredClone(seedSarDrafts);
  private readonly audit: AuditEvent[] = structuredClone(seedAudit);
  private readonly relationshipGraph = structuredClone(seedRelationshipGraph);

  constructor(
    private readonly detector: MicrotransactionDetectorService,
    private readonly researchRisk: ResearchRiskService,
    private readonly fraudEngine: FraudEngineService,
    private readonly security: SecurityService,
  ) {}

  workspace(): AmlWorkspaceSnapshot {
    return {
      overview: this.overview(),
      transactions: this.transactions.slice(0, 50),
      microtransactionClusters: this.microtransactionClusters(),
      customers: this.customers.map((customer) => this.sanitizeCustomer(customer)),
      businesses: this.businesses.map((business) => this.sanitizeBusiness(business)),
      screeningChecks: this.screeningChecks.map((check) => this.sanitizeScreening(check)),
      rules: this.rules.map((rule) => this.sanitizeRule(rule)),
      alerts: this.alerts,
      investigations: this.investigations,
      sarDrafts: this.sarDrafts.map((draft) => this.sanitizeSarDraft(draft)),
      audit: this.audit.slice(0, 50).map((event) => this.sanitizeAudit(event)),
      finraCourses,
      researchPaperReviews,
      researchImplementations,
      repositoryReviews,
      relationshipGraph: this.relationshipGraph,
    };
  }

  overview(): AmlOverview {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = this.transactions.filter((transaction) => new Date(transaction.timestamp) >= today);
    const clusters = this.microtransactionClusters();
    const highRiskCustomers = this.customers.filter((customer) => customer.customerRiskScore >= 60);
    const highRiskBusinesses = this.businesses.filter((business) => business.riskScore >= 60);
    const alertHandlingMinutes = this.alerts.map((alert) =>
      Math.max(1, (new Date(alert.updatedAt).getTime() - new Date(alert.createdAt).getTime()) / 60_000),
    );
    const sanctionsMatches = this.screeningChecks.filter((check) => check.checkType === "sanctions" && check.disposition !== "clear").length;
    const pepMatches = this.screeningChecks.filter((check) => check.checkType === "pep" && check.disposition !== "clear").length;
    const adverseMediaMatches = this.screeningChecks.filter((check) => check.checkType === "adverse_media" && check.disposition !== "clear").length;

    return {
      metrics: [
        { label: "Transactions monitored today", value: todayTransactions.length, format: "number" },
        { label: "Total value monitored", value: this.sum(this.transactions), format: "currency" },
        { label: "Alerts generated", value: this.alerts.length, format: "number", risk: "high" },
        { label: "Suspicious microtransaction clusters", value: clusters.length, format: "number", risk: "high" },
        { label: "High-risk customers", value: highRiskCustomers.length, format: "number", risk: "high" },
        { label: "High-risk businesses", value: highRiskBusinesses.length, format: "number", risk: "high" },
        { label: "Sanctions matches", value: sanctionsMatches, format: "number", risk: sanctionsMatches > 0 ? "critical" : "low" },
        { label: "PEP matches", value: pepMatches, format: "number", risk: pepMatches > 0 ? "high" : "low" },
        { label: "Adverse-media matches", value: adverseMediaMatches, format: "number", risk: adverseMediaMatches > 0 ? "medium" : "low" },
        { label: "KYC reviews due", value: this.customers.filter((customer) => new Date(customer.nextReviewDate) <= new Date()).length, format: "number" },
        { label: "KYB reviews due", value: this.businesses.filter((business) => new Date(business.nextReviewDate) <= new Date()).length, format: "number" },
        { label: "Transactions approved", value: this.transactions.filter((transaction) => transaction.status === "approved").length, format: "number", risk: "low" },
        { label: "Transactions under review", value: this.transactions.filter((transaction) => transaction.status === "review").length, format: "number", risk: "medium" },
        { label: "Transactions held", value: this.transactions.filter((transaction) => transaction.status === "held").length, format: "number", risk: "high" },
        { label: "Transactions blocked", value: this.transactions.filter((transaction) => transaction.status === "blocked").length, format: "number", risk: "critical" },
        { label: "Open AML investigations", value: this.investigations.filter((item) => item.status !== "closed").length, format: "number" },
        { label: "Cases awaiting MLRO review", value: this.investigations.filter((item) => item.status === "mlro_review").length, format: "number", risk: "critical" },
        { label: "SAR drafts awaiting approval", value: this.sarDrafts.filter((draft) => draft.mlroReviewStatus === "ready_for_review").length, format: "number", risk: "high" },
        { label: "False-positive rate", value: Math.round(average(this.rules.map((rule) => rule.performance.falsePositiveRate)) * 10) / 10, format: "percent" },
        { label: "Average alert-handling time", value: Math.round(average(alertHandlingMinutes)), format: "minutes" },
        { label: "FINRA courses mapped", value: finraCourses.length, format: "number", risk: "low" },
        { label: "Research controls active", value: researchImplementations.filter((item) => item.status === "active").length, format: "number", risk: "low" },
      ],
      alertVolumeOverTime: this.timelinePoints(this.alerts.map((alert) => alert.createdAt), "Alerts"),
      riskDistribution: this.riskDistribution(),
      transactionValueByRisk: this.valueByRisk(),
      microtransactionClustersOverTime: this.timelinePoints(clusters.map((cluster) => cluster.lastSeenAt), "Clusters"),
      fanInActivity: this.scenarioPoints(clusters, "fan_in"),
      fanOutActivity: this.scenarioPoints(clusters, "fan_out"),
      highRiskCorridors: this.corridorPoints(),
      ruleTriggerFrequency: this.ruleFrequency(),
      alertOutcomes: this.alertOutcomePoints(),
      investigationWorkload: this.investigationWorkload(),
      customerRiskChanges: this.customers.map((customer) => ({ label: customer.id, value: customer.customerRiskScore, risk: this.levelFor(customer.customerRiskScore) })),
      businessRiskChanges: this.businesses.map((business) => ({ label: business.tradingName, value: business.riskScore, risk: this.levelFor(business.riskScore) })),
      highestRiskPaymentCorridors: this.corridorPoints().slice(0, 4).map((point) => point.label),
      mostTriggeredScenarios: this.ruleFrequency().slice(0, 5).map((point) => point.label),
      providerStatuses: [
        { provider: "African Guard Screening Network", status: "test_result", detail: "Controlled screening data is available for workflow validation." },
        { provider: "African Guard Entity Intelligence", status: "manual_verification_required", detail: "Enhanced review is routed through the secure server-side gateway." },
        { provider: "African Guard Company Intelligence", status: "provider_unavailable", detail: "Live company-data checks require secure server-side configuration." },
      ],
      scenarioCoverage,
    };
  }

  listTransactions(query: ListAmlTransactionsQueryDto): Paginated<AmlTransaction> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 12));
    const normalizedSearch = query.search?.toLowerCase().trim();
    let items = this.transactions.filter((transaction) => {
      if (normalizedSearch) {
        const haystack = [
          transaction.id,
          transaction.eventId,
          transaction.institution,
          transaction.customerId,
          transaction.businessId,
          transaction.sender,
          transaction.receiver,
          transaction.beneficiary,
          transaction.merchant,
          transaction.description,
        ].join(" ").toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (query.risk && this.levelFor(transaction.unifiedRisk) !== query.risk) return false;
      if (query.institution && transaction.institution !== query.institution) return false;
      if (query.currency && transaction.currency !== query.currency) return false;
      if (query.country && transaction.originCountry !== query.country && transaction.destinationCountry !== query.country) return false;
      if (query.channel && transaction.channel !== query.channel) return false;
      if (query.alertStatus && transaction.alertStatus !== query.alertStatus) return false;
      if (query.dateFrom && new Date(transaction.timestamp) < new Date(query.dateFrom)) return false;
      if (query.dateTo && new Date(transaction.timestamp) > new Date(query.dateTo)) return false;
      return true;
    });

    const sortBy = query.sortBy ?? "timestamp";
    const direction = query.sortDirection === "asc" ? 1 : -1;
    items = items.sort((a, b) => String(this.sortValue(a, sortBy)).localeCompare(String(this.sortValue(b, sortBy)), undefined, { numeric: true }) * direction);
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  }

  transaction(id: string) {
    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction) throw new NotFoundException(`AML transaction ${id} was not found.`);
    const customer = this.customers.find((item) => item.id === transaction.customerId);
    const business = this.businesses.find((item) => item.id === transaction.businessId);
    return {
      transaction,
      customer: customer ? this.sanitizeCustomer(customer) : undefined,
      business: business ? this.sanitizeBusiness(business) : undefined,
      counterparty: {
        receiver: transaction.receiver,
        beneficiary: transaction.beneficiary,
        merchant: transaction.merchant,
      },
      rollingWindows: this.detector.calculateRollingWindows(this.transactions, transaction),
      relatedAlerts: this.alerts.filter((alert) => alert.relatedTransactions.includes(transaction.id)),
      relatedInvestigations: this.investigations.filter((investigation) => investigation.linkedTransactions.includes(transaction.id)),
      graph: this.relationshipGraph,
    };
  }

  evaluateTransaction(dto: EvaluateAmlTransactionDto, actor: ActorContext) {
    const transaction = this.buildTransaction(dto);
    const decision = this.scoreTransaction(transaction);
    const evaluated: AmlTransaction = {
      ...transaction,
      fraudRisk: decision.fraudRisk,
      amlRisk: decision.amlRisk,
      unifiedRisk: decision.unifiedRisk,
      decision: decision.decision,
      status: decision.decision === "block" ? "blocked" : decision.decision === "hold" ? "held" : decision.decision === "review" || decision.decision === "escalate" ? "review" : "approved",
      rulesTriggered: decision.reasons.filter((reason) => reason.startsWith("rule-")),
      alertStatus: decision.riskLevel === "high" || decision.riskLevel === "critical" ? "new" : "none",
      componentScores: decision.componentScores,
      explainability: decision.explainability,
      recommendedAction: this.recommendedAction(decision.unifiedRisk, decision.decision),
      researchSignals: decision.researchSignals,
    };

    this.transactions.unshift(evaluated);
    this.auditAction(actor, "aml.transaction.evaluated", evaluated.id, {
      previous: null,
      next: { risk: evaluated.unifiedRisk, decision: evaluated.decision },
      reason: "Transaction evaluated through AML module.",
      correlationId: evaluated.eventId,
    });

    const alert = this.createAlertForTransaction(evaluated, decision);
    return { transaction: evaluated, decision, alert };
  }

  batchEvaluate(dto: BatchEvaluateAmlTransactionsDto, actor: ActorContext) {
    return dto.transactions.map((transaction) => this.evaluateTransaction(transaction, actor));
  }

  microtransactionClusters() {
    return this.mergeClusters(seededClusters, this.detector.detectClusters(this.transactions, this.rules));
  }

  microtransactionCluster(id: string) {
    const cluster = this.microtransactionClusters().find((item) => item.id === id);
    if (!cluster) throw new NotFoundException(`Microtransaction cluster ${id} was not found.`);
    return {
      cluster,
      transactions: this.transactions.filter((transaction) => cluster.transactionIds.includes(transaction.id)),
      rollingWindows: this.detector.calculateRollingWindows(
        this.transactions,
        this.transactions.find((transaction) => transaction.id === cluster.transactionIds[0]) ?? this.transactions[0]!,
      ),
      graph: this.relationshipGraph,
    };
  }

  customersList() {
    return this.customers.map((customer) => this.sanitizeCustomer(customer));
  }

  customer(id: string) {
    const customer = this.customers.find((item) => item.id === id);
    if (!customer) throw new NotFoundException(`Customer ${id} was not found.`);
    return {
      customer: this.sanitizeCustomer(customer),
      transactions: this.transactions.filter((transaction) => transaction.customerId === id),
      alerts: this.alerts.filter((alert) => alert.subjectId === id),
      screening: this.screeningChecks.filter((check) => check.subjectId === id).map((check) => this.sanitizeScreening(check)),
    };
  }

  assessCustomer(id: string, actor: ActorContext) {
    const customer = this.customers.find((item) => item.id === id);
    if (!customer) throw new NotFoundException(`Customer ${id} was not found.`);
    const previous = customer.customerRiskScore;
    const related = this.transactions.filter((transaction) => transaction.customerId === id);
    const avgRisk = Math.round(average(related.map((transaction) => transaction.unifiedRisk)));
    customer.customerRiskScore = Math.round(clamp(customer.customerRiskScore * 0.55 + avgRisk * 0.45));
    customer.kycStatus = customer.customerRiskScore >= 75 ? "edd_required" : customer.customerRiskScore >= 55 ? "referred" : "passed";
    customer.lastReviewDate = nowIso();
    customer.nextReviewDate = minutesFromNow(customer.customerRiskScore >= 75 ? 60 * 24 * 30 : 60 * 24 * 180);
    this.auditAction(actor, "aml.kyc.assessed", id, { previous, next: customer.customerRiskScore, reason: "KYC risk recalculated from transaction and screening evidence." });
    return this.sanitizeCustomer(customer);
  }

  refreshCustomer(id: string, actor: ActorContext) {
    const customer = this.assessCustomer(id, actor);
    const raw = this.customers.find((item) => item.id === id);
    if (raw) raw.checks = raw.checks.map((check) => ({ ...check, status: check.status === "provider_unavailable" ? "manual_verification_required" : check.status }));
    this.auditAction(actor, "aml.kyc.refresh_requested", id, { reason: "KYC refresh requested by analyst/compliance workflow." });
    return this.sanitizeCustomer(raw ?? customer);
  }

  businessesList() {
    return this.businesses.map((business) => this.sanitizeBusiness(business));
  }

  business(id: string) {
    const business = this.businesses.find((item) => item.id === id);
    if (!business) throw new NotFoundException(`Business ${id} was not found.`);
    return {
      business: this.sanitizeBusiness(business),
      transactions: this.transactions.filter((transaction) => transaction.businessId === id),
      alerts: this.alerts.filter((alert) => alert.subjectId === id),
      screening: this.screeningChecks.filter((check) => check.subjectId === id).map((check) => this.sanitizeScreening(check)),
      graph: this.sanitizeBusiness(business).ownershipGraph,
    };
  }

  assessBusiness(id: string, actor: ActorContext) {
    const business = this.businesses.find((item) => item.id === id);
    if (!business) throw new NotFoundException(`Business ${id} was not found.`);
    const previous = business.riskScore;
    const related = this.transactions.filter((transaction) => transaction.businessId === id);
    const turnoverMismatch = related.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0) > business.expectedTransactionVolume * 0.35;
    business.riskScore = Math.round(clamp(business.riskScore + (turnoverMismatch ? 6 : -3)));
    business.kybStatus = business.riskScore >= 75 ? "edd_required" : business.riskScore >= 55 ? "referred" : "passed";
    business.lastReviewDate = nowIso();
    business.nextReviewDate = minutesFromNow(business.riskScore >= 75 ? 60 * 24 * 30 : 60 * 24 * 180);
    this.auditAction(actor, "aml.kyb.assessed", id, { previous, next: business.riskScore, reason: "KYB risk recalculated from transaction volume and ownership indicators." });
    return this.sanitizeBusiness(business);
  }

  refreshBusiness(id: string, actor: ActorContext) {
    const business = this.assessBusiness(id, actor);
    this.auditAction(actor, "aml.kyb.refresh_requested", id, { reason: "KYB refresh requested by analyst/compliance workflow." });
    return this.sanitizeBusiness(business);
  }

  createScreening(dto: ScreeningRequestDto, actor: ActorContext) {
    const check: ScreeningCheck = {
      id: `scr-${randomUUID().slice(0, 8)}`,
      subjectId: dto.subjectId,
      subjectType: dto.subjectType,
      checkType: dto.checkType,
      provider: "African Guard Screening Network",
      resultStatus: "manual_verification_required",
      datasetVersion: "AG-SCREENING-CONTROLLED",
      checkedAt: nowIso(),
      matchScore: 0,
      matchingFields: [],
      disposition: "needs_review",
      reviewer: actor.actor,
      evidence: [
        "Manual verification is required before disposition.",
      ],
      nextReviewDate: minutesFromNow(60 * 24 * 7),
    };
    this.screeningChecks.unshift(check);
    this.auditAction(actor, "aml.screening.requested", check.id, { reason: `Requested ${dto.checkType} screening for ${dto.subjectId}.` });
    return this.sanitizeScreening(check);
  }

  screening(id: string) {
    const check = this.screeningChecks.find((item) => item.id === id);
    if (!check) throw new NotFoundException(`Screening check ${id} was not found.`);
    return this.sanitizeScreening(check);
  }

  rulesList() {
    return this.rules.map((rule) => this.sanitizeRule(rule));
  }

  createRule(dto: CreateAmlRuleDto, actor: ActorContext) {
    const rule: AmlRule = {
      id: `rule-${this.security.pseudonymize(`${dto.name}-${Date.now()}`)}`,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      jurisdiction: "configurable",
      institution: "all",
      customerSegment: "all",
      businessSegment: "all",
      transactionChannel: "all",
      field: dto.field,
      operator: dto.operator,
      comparisonValue: dto.comparisonValue,
      aggregation: dto.operator.includes("count") ? "count" : dto.operator.includes("average") ? "average" : dto.operator.includes("percentage") ? "percentage" : "sum",
      rollingWindow: dto.rollingWindow,
      countThreshold: dto.countThreshold,
      cumulativeThreshold: dto.cumulativeThreshold,
      scoreContribution: dto.scoreContribution,
      priority: this.levelFor(dto.scoreContribution + 45),
      action: dto.action,
      effectiveDate: nowIso(),
      owner: actor.actor,
      version: 1,
      approvalStatus: "draft",
      productionStatus: "draft",
      logic: { join: "AND", conditions: [{ field: dto.field, operator: dto.operator, value: dto.comparisonValue }] },
      estimatedAlertVolume: 0,
      estimatedFalsePositiveRate: 0,
      performance: { truePositiveRate: 0, falsePositiveRate: 0, lastBacktestedAt: nowIso() },
      versionHistory: [{ version: 1, changedAt: nowIso(), changedBy: actor.actor, reason: dto.reason ?? "Rule created." }],
    };
    this.rules.unshift(rule);
    this.auditAction(actor, "aml.rule.created", rule.id, { previous: null, next: rule, reason: dto.reason ?? "Rule created." });
    return this.sanitizeRule(rule);
  }

  patchRule(id: string, dto: PatchAmlRuleDto, actor: ActorContext) {
    const rule = this.requireRule(id);
    const previous = structuredClone(rule);
    Object.assign(rule, {
      name: dto.name ?? rule.name,
      description: dto.description ?? rule.description,
      comparisonValue: dto.comparisonValue ?? rule.comparisonValue,
      countThreshold: dto.countThreshold ?? rule.countThreshold,
      cumulativeThreshold: dto.cumulativeThreshold ?? rule.cumulativeThreshold,
      scoreContribution: dto.scoreContribution ?? rule.scoreContribution,
      version: rule.version + 1,
      approvalStatus: "draft",
      productionStatus: "draft",
    });
    rule.versionHistory.unshift({ version: rule.version, changedAt: nowIso(), changedBy: actor.actor, reason: dto.reason ?? "Rule edited." });
    this.auditAction(actor, "aml.rule.edited", id, { previous, next: rule, reason: dto.reason ?? "Rule edited." });
    return this.sanitizeRule(rule);
  }

  testRule(id: string) {
    const rule = this.requireRule(id);
    const matchedTransactions = this.transactions.filter((transaction) => transaction.rulesTriggered.includes(rule.id));
    return {
      ruleId: id,
      matchedTransactions: matchedTransactions.map((transaction) => transaction.id),
      estimatedAlertVolume: matchedTransactions.length,
      estimatedFalsePositiveRate: Math.max(3, rule.performance.falsePositiveRate),
      sampleEvidence: matchedTransactions.slice(0, 3).flatMap((transaction) => transaction.explainability.map((factor) => factor.evidence)),
    };
  }

  backtestRule(id: string, actor: ActorContext) {
    const rule = this.requireRule(id);
    const result = this.testRule(id);
    rule.estimatedAlertVolume = result.estimatedAlertVolume;
    rule.estimatedFalsePositiveRate = result.estimatedFalsePositiveRate;
    rule.performance = {
      truePositiveRate: Math.min(96, 60 + result.estimatedAlertVolume * 4),
      falsePositiveRate: result.estimatedFalsePositiveRate,
      lastBacktestedAt: nowIso(),
    };
    this.auditAction(actor, "aml.rule.backtested", id, { next: rule.performance, reason: "Backtest completed against seeded transaction history." });
    return { rule: this.sanitizeRule(rule), result };
  }

  approveRule(id: string, actor: ActorContext) {
    const rule = this.requireRule(id);
    if (rule.owner === actor.actor && actor.role === "rule_administrator") {
      return { rule: this.sanitizeRule(rule), message: "Four-eyes review required: rule administrators cannot approve their own rule." };
    }
    const previous = structuredClone(rule);
    rule.approvalStatus = "approved";
    rule.productionStatus = "approved";
    rule.versionHistory.unshift({ version: rule.version, changedAt: nowIso(), changedBy: actor.actor, reason: "Rule approved through four-eyes review." });
    this.auditAction(actor, "aml.rule.approved", id, { previous, next: rule, reason: "Four-eyes approval completed." });
    return { rule: this.sanitizeRule(rule), message: "Rule approved." };
  }

  activateRule(id: string, actor: ActorContext) {
    const rule = this.requireRule(id);
    const previous = structuredClone(rule);
    if (rule.approvalStatus !== "approved") return { rule: this.sanitizeRule(rule), message: "Rule must be approved before activation." };
    rule.productionStatus = "active";
    this.auditAction(actor, "aml.rule.activated", id, { previous, next: rule, reason: "Rule activated." });
    return { rule: this.sanitizeRule(rule), message: "Rule activated." };
  }

  deactivateRule(id: string, actor: ActorContext) {
    const rule = this.requireRule(id);
    const previous = structuredClone(rule);
    rule.productionStatus = "inactive";
    this.auditAction(actor, "aml.rule.deactivated", id, { previous, next: rule, reason: "Rule deactivated." });
    return { rule: this.sanitizeRule(rule), message: "Rule deactivated." };
  }

  alertsList() {
    return this.alerts;
  }

  alert(id: string) {
    const alert = this.alerts.find((item) => item.id === id);
    if (!alert) throw new NotFoundException(`AML alert ${id} was not found.`);
    return {
      alert,
      transactions: this.transactions.filter((transaction) => alert.relatedTransactions.includes(transaction.id)),
      investigation: this.investigations.find((investigation) => investigation.alertId === id),
    };
  }

  patchAlert(id: string, dto: PatchAmlAlertDto, actor: ActorContext) {
    const alert = this.requireAlert(id);
    const previous = structuredClone(alert);
    alert.assignedAnalyst = dto.assignedAnalyst ?? alert.assignedAnalyst;
    alert.status = dto.status ?? alert.status;
    alert.updatedAt = nowIso();
    this.auditAction(actor, "aml.alert.updated", id, { previous, next: alert, reason: dto.note ?? "Alert updated." });
    return alert;
  }

  assignAlert(id: string, dto: AssignAmlAlertDto, actor: ActorContext) {
    return this.patchAlert(id, { assignedAnalyst: dto.analyst, status: "assigned", note: dto.reason }, actor);
  }

  escalateAlert(id: string, dto: AmlActionReasonDto, actor: ActorContext) {
    const alert = this.requireAlert(id);
    const previous = structuredClone(alert);
    alert.status = "referred_to_mlro";
    alert.updatedAt = nowIso();
    this.auditAction(actor, "aml.alert.escalated", id, { previous, next: alert, reason: dto.reason ?? "Escalated to MLRO-equivalent review." });
    return alert;
  }

  convertAlertToCase(id: string, dto: AmlActionReasonDto, actor: ActorContext) {
    const alert = this.requireAlert(id);
    const existing = this.investigations.find((item) => item.alertId === id);
    if (existing) return existing;
    const caseId = `aml-case-${randomUUID().slice(0, 8)}`;
    const investigation: AmlInvestigation = {
      id: caseId,
      alertId: id,
      owner: actor.actor,
      priority: alert.riskScores.unified >= 80 ? "critical" : "high",
      hypothesis: alert.explanation,
      status: alert.riskScores.unified >= 80 ? "mlro_review" : "open",
      linkedEntities: [alert.subjectId],
      linkedTransactions: alert.relatedTransactions,
      sourceOfFundsAnalysis: "Source-of-funds analysis pending investigator evidence.",
      sourceOfWealthAnalysis: "Source-of-wealth analysis pending KYC/KYB refresh.",
      findings: alert.evidence,
      recommendedAction: alert.suggestedAction,
      evidenceExportReady: true,
      timeline: [{ at: nowIso(), actor: actor.actor, action: "case_created", detail: dto.reason ?? "Alert converted to investigation." }],
      evidence: alert.evidence.map((evidence, index) => ({ id: `ev-${caseId}-${index}`, type: "aml_alert", label: evidence, confidence: 82 })),
      auditHistory: [],
    };
    this.investigations.unshift(investigation);
    alert.status = "converted_to_case";
    alert.relatedCases = [...new Set([...alert.relatedCases, caseId])];
    alert.updatedAt = nowIso();
    this.auditAction(actor, "aml.alert.converted_to_case", id, { next: investigation, reason: dto.reason ?? "Alert converted to case." });
    return investigation;
  }

  closeAlert(id: string, dto: CloseAmlAlertDto, actor: ActorContext) {
    const alert = this.requireAlert(id);
    const previous = structuredClone(alert);
    alert.status = dto.status;
    alert.updatedAt = nowIso();
    this.auditAction(actor, "aml.alert.closed", id, { previous, next: alert, reason: dto.reason });
    if (dto.status === "closed_false_positive") {
      this.auditAction(actor, "learning.feedback.recorded", id, { label: "false_positive", reason: dto.reason });
    }
    return alert;
  }

  sarDraftsList() {
    return this.sarDrafts.map((draft) => this.sanitizeSarDraft(draft));
  }

  createSarDraft(dto: CreateSarDraftDto, actor: ActorContext) {
    const investigation = this.investigations.find((item) => item.id === dto.caseId);
    if (!investigation) throw new NotFoundException(`AML investigation ${dto.caseId} was not found.`);
    const transactions = this.transactions.filter((transaction) => investigation.linkedTransactions.includes(transaction.id));
    const draft: SarDraft = {
      id: `sar-draft-${randomUUID().slice(0, 8)}`,
      caseId: investigation.id,
      subjectIds: investigation.linkedEntities.filter((entity) => entity.startsWith("cust")),
      businessIds: investigation.linkedEntities.filter((entity) => entity.startsWith("bus")),
      accountIds: [...new Set(transactions.map((transaction) => transaction.accountId))],
      walletIds: [...new Set(transactions.map((transaction) => transaction.walletId).filter((value): value is string => Boolean(value)))],
      transactionChronology: transactions.map((transaction) => `${transaction.timestamp}: ${transaction.id} ${transaction.currency} ${transaction.amount} ${transaction.sender} to ${transaction.receiver}`),
      totalSuspiciousValue: this.sum(transactions),
      suspicionIndicators: investigation.findings,
      reasonForSuspicion: `Decision Intelligence draft requiring human validation. ${investigation.hypothesis}`,
      paymentCorridors: [...new Set(transactions.map((transaction) => `${transaction.originCountry}-${transaction.destinationCountry}`))],
      sourceOfFundsConcerns: [investigation.sourceOfFundsAnalysis],
      relatedEntities: investigation.linkedEntities,
      supportingEvidence: investigation.evidence.map((item) => item.id),
      internalReferences: [investigation.alertId],
      glossaryCategories: ["AML", "transaction monitoring", "microtransaction intelligence"],
      investigator: actor.actor,
      mlroReviewStatus: "ready_for_review",
      narrative: `Decision Intelligence draft requiring human validation. ${investigation.hypothesis} Supporting evidence: ${investigation.findings.join("; ")}.`,
      aiGenerated: true,
      tippingOffControls: ["No customer-facing notes", "Restricted export", "Manual submission only", "Versioned edits after approval"],
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.sarDrafts.unshift(draft);
    this.auditAction(actor, "aml.sar.generated", draft.id, { reason: dto.reason ?? "SAR draft generated for MLRO review.", relatedCase: investigation.id });
    return this.sanitizeSarDraft(draft);
  }

  approveSarDraft(id: string, dto: AmlActionReasonDto, actor: ActorContext) {
    const draft = this.sarDrafts.find((item) => item.id === id);
    if (!draft) throw new NotFoundException(`SAR draft ${id} was not found.`);
    const previous = structuredClone(draft);
    draft.mlroReviewStatus = "approved";
    draft.approvedBy = actor.actor;
    draft.updatedAt = nowIso();
    this.auditAction(actor, "aml.sar.approved", id, { previous, next: draft, reason: dto.reason ?? "SAR draft approved by authorised reviewer." });
    return this.sanitizeSarDraft(draft);
  }

  auditList() {
    return this.audit.slice(0, 100).map((event) => this.sanitizeAudit(event));
  }

  finraCourseList() {
    return finraCourses;
  }

  researchPaperList() {
    return researchPaperReviews;
  }

  researchImplementationList() {
    return researchImplementations;
  }

  repositoryReviewList() {
    return repositoryReviews;
  }

  evaluateSyntheticStreamEvent() {
    const source = this.transactions[Math.floor(Math.random() * this.transactions.length)] ?? this.transactions[0]!;
    const synthetic = this.buildTransaction({
      ...source,
      id: `txn-live-${randomUUID().slice(0, 8)}`,
      eventId: `evt-live-${randomUUID().slice(0, 8)}`,
      amount: Math.max(6, Math.round(source.amount * (0.72 + Math.random() * 0.45))),
      baseCurrencyEquivalent: Math.max(6, Math.round(source.baseCurrencyEquivalent * (0.72 + Math.random() * 0.45))),
      timestamp: nowIso(),
      description: `${source.description} live simulation`,
      status: undefined,
    });
    const result = this.evaluateTransaction(synthetic, { actor: "aml-stream", role: "admin" });
    const clusters = this.microtransactionClusters().slice(0, 2);
    return {
      transaction: result.transaction,
      alert: result.alert,
      clusters,
      overview: this.overview(),
      customer: this.customers.find((customer) => customer.customerRiskScore >= 60) ?? this.customers[0],
      business: this.businesses.find((business) => business.riskScore >= 60) ?? this.businesses[0],
      screening: this.screeningChecks.find((check) => check.disposition === "true_match" || check.disposition === "possible_match") ?? this.screeningChecks[0],
      case: this.investigations.find((investigation) => investigation.status === "mlro_review") ?? this.investigations[0],
      sar: this.sarDrafts.find((draft) => draft.mlroReviewStatus === "ready_for_review") ?? this.sarDrafts[0],
    };
  }

  sanitizeRealtimeEvent(aml: ReturnType<AmlService["evaluateSyntheticStreamEvent"]>) {
    return {
      transaction: aml.transaction,
      alert: aml.alert,
      clusters: aml.clusters,
      overview: aml.overview,
      customer: aml.customer ? this.sanitizeCustomer(aml.customer) : undefined,
      business: aml.business ? this.sanitizeBusiness(aml.business) : undefined,
      screening: aml.screening ? this.sanitizeScreening(aml.screening) : undefined,
      case: aml.case,
      sar: aml.sar ? this.sanitizeSarDraft(aml.sar) : undefined,
    };
  }

  private buildTransaction(dto: EvaluateAmlTransactionDto | AmlTransaction): AmlTransaction {
    const timestamp = dto.timestamp ?? nowIso();
    const customer = this.customers.find((item) => item.id === dto.customerId);
    const business = this.businesses.find((item) => item.id === dto.businessId);
    const baseCurrencyEquivalent = dto.baseCurrencyEquivalent ?? dto.amount;
    return {
      id: dto.id ?? `txn-${randomUUID().slice(0, 8)}`,
      eventId: dto.eventId,
      institution: dto.institution,
      customerId: dto.customerId,
      businessId: dto.businessId,
      accountId: dto.accountId,
      walletId: dto.walletId,
      sender: dto.sender,
      receiver: dto.receiver,
      beneficiary: dto.beneficiary,
      merchant: dto.merchant,
      amount: dto.amount,
      currency: dto.currency,
      baseCurrencyEquivalent,
      originCountry: dto.originCountry,
      destinationCountry: dto.destinationCountry,
      channel: dto.channel,
      paymentMethod: dto.paymentMethod,
      deviceId: dto.deviceId,
      ipAddress: dto.ipAddress,
      phoneHash: dto.phoneHash,
      addressHash: dto.addressHash,
      beneficialOwnerId: dto.beneficialOwnerId,
      description: dto.description,
      direction: dto.direction,
      timestamp,
      status: dto.status ?? "review",
      fraudRisk: "fraudRisk" in dto ? dto.fraudRisk : 0,
      amlRisk: "amlRisk" in dto ? dto.amlRisk : 0,
      unifiedRisk: "unifiedRisk" in dto ? dto.unifiedRisk : 0,
      decision: "decision" in dto ? dto.decision : "review",
      rulesTriggered: "rulesTriggered" in dto ? dto.rulesTriggered : [],
      alertStatus: "alertStatus" in dto ? dto.alertStatus : "none",
      componentScores: "componentScores" in dto ? dto.componentScores : this.blankScores(customer, business),
      explainability: "explainability" in dto ? dto.explainability : [],
      linkedTransactionIds: "linkedTransactionIds" in dto ? dto.linkedTransactionIds : this.transactions.filter((item) => item.customerId === dto.customerId).slice(0, 5).map((item) => item.id),
      linkedDevices: "linkedDevices" in dto ? dto.linkedDevices : [dto.deviceId],
      linkedIpAddresses: "linkedIpAddresses" in dto ? dto.linkedIpAddresses : [dto.ipAddress],
      linkedAccounts: "linkedAccounts" in dto ? dto.linkedAccounts : [dto.accountId],
      sharedBeneficiaries: "sharedBeneficiaries" in dto ? dto.sharedBeneficiaries : [dto.beneficiary],
      historicalAlerts: "historicalAlerts" in dto ? dto.historicalAlerts : this.alerts.filter((alert) => alert.subjectId === dto.customerId).map((alert) => alert.id),
      recommendedAction: "recommendedAction" in dto ? dto.recommendedAction : "Evaluate through AML controls.",
    };
  }

  private scoreTransaction(transaction: AmlTransaction): AmlRiskDecision {
    const customer = this.customers.find((item) => item.id === transaction.customerId);
    const business = this.businesses.find((item) => item.id === transaction.businessId);
    const clusters = this.detector.detectClusters([transaction, ...this.transactions], this.rules);
    const relatedClusters = clusters.filter((cluster) => cluster.transactionIds.includes(transaction.id));
    const rollingWindows = this.detector.calculateRollingWindows([transaction, ...this.transactions], transaction);
    const researchSignals = this.researchRisk.analyzeTransaction(transaction, [transaction, ...this.transactions], this.relationshipGraph);
    const researchScore = Math.max(0, ...researchSignals.map((signal) => signal.score));
    const rulesTriggered = [...new Set([...transaction.rulesTriggered, ...relatedClusters.flatMap((cluster) => this.rulesForScenario(cluster.scenario))])];
    const ruleScore = clamp(rulesTriggered.reduce((sum, ruleId) => sum + (this.rules.find((rule) => rule.id === ruleId)?.scoreContribution ?? 8), 0));
    const kycRisk = customer?.customerRiskScore ?? 35;
    const kybRisk = business?.riskScore ?? 0;
    const microRisk = Math.max(transaction.componentScores.microtransactionCluster, ...relatedClusters.map((cluster) => cluster.riskScore), 0);
    const velocityRisk = Math.max(...rollingWindows.map((window) => clamp(window.transactionCount * 12 + window.totalAmount / 150)));
    const fraudEvent: FraudEventInput = {
      event_type: "transaction",
      user_id: transaction.customerId,
      institution_id: "inst-afb",
      amount: transaction.baseCurrencyEquivalent,
      currency: transaction.currency,
      account_id: transaction.accountId,
      device_id: transaction.deviceId,
      ip_address: transaction.ipAddress,
      country: transaction.originCountry,
      channel: transaction.channel === "api" ? "api" : transaction.channel === "branch" ? "branch" : "mobile",
      signals: {
        amount_zscore: transaction.baseCurrencyEquivalent > 5000 ? 4.2 : 1.1,
        velocity_5m: rollingWindows.find((window) => window.window === "5m")?.transactionCount ?? 0,
        velocity_24h: rollingWindows.find((window) => window.window === "24h")?.transactionCount ?? 0,
        device_reputation: transaction.linkedDevices.length > 1 ? 72 : transaction.deviceId.includes("shared") ? 76 : 24,
        ip_risk: transaction.ipAddress.endsWith(".42") ? 72 : 26,
        behavior_deviation: Math.max(kycRisk, kybRisk) * 0.62,
        beneficiary_risk: transaction.beneficiary.toLowerCase().includes("new") ? 76 : 34,
        graph_risk: transaction.deviceId.includes("shared") || transaction.businessId === "bus-dormant-303" ? 78 : 32,
        consortium_hits: transaction.historicalAlerts.length,
        blacklist_confidence: transaction.rulesTriggered.includes("rule-sanctions-match") ? 96 : 0,
        aml_risk: Math.max(kycRisk, kybRisk, microRisk),
        sanctions_hit: transaction.rulesTriggered.includes("rule-sanctions-match"),
        payment_delay_seconds: 120,
      },
    };
    const fraudDecision = this.fraudEngine.scoreEvent(fraudEvent);
    const scores: AmlScoreBreakdown = {
      deterministicRules: ruleScore,
      mlAnomaly: fraudDecision.component_scores.ml_anomaly,
      behaviouralProfile: fraudDecision.component_scores.behavioural_profile,
      identityGraph: Math.max(fraudDecision.component_scores.identity_graph, researchSignals.find((signal) => signal.id.includes("graph"))?.score ?? 0),
      consortiumIntelligence: fraudDecision.component_scores.consortium_intelligence,
      amlSanctions: fraudDecision.component_scores.aml_sanctions,
      customerKyc: kycRisk,
      businessKyb: kybRisk,
      deviceRisk: fraudEvent.signals?.device_reputation ?? 0,
      geographicRisk: transaction.originCountry !== transaction.destinationCountry ? 58 : 18,
      beneficiaryRisk: fraudEvent.signals?.beneficiary_risk ?? 0,
      transactionVelocity: velocityRisk,
      microtransactionCluster: microRisk,
      historicalOutcomes: Math.max(transaction.historicalAlerts.length * 18, researchSignals.find((signal) => signal.id.includes("retrieval"))?.score ?? 0),
    };
    const fraudRisk = fraudDecision.risk_score;
    const amlRisk = Math.round(
      clamp(
        scores.deterministicRules * 0.16 +
          scores.amlSanctions * 0.18 +
          scores.customerKyc * 0.11 +
          scores.businessKyb * 0.1 +
          scores.identityGraph * 0.1 +
          scores.microtransactionCluster * 0.17 +
          scores.transactionVelocity * 0.1 +
          scores.beneficiaryRisk * 0.08 +
          researchScore * 0.12,
      ),
    );
    const unifiedRisk = Math.round(clamp(fraudRisk * 0.42 + amlRisk * 0.58));
    const riskLevel = this.levelFor(unifiedRisk);
    const decision = transaction.rulesTriggered.includes("rule-sanctions-match")
      ? "hold"
      : unifiedRisk >= 85
        ? "escalate"
        : unifiedRisk >= 75
          ? "hold"
          : unifiedRisk >= 60
            ? "review"
            : unifiedRisk >= 35
              ? "approve_monitor"
              : "approve";
    const explainability = [
      ...fraudDecision.explainability.top_factors.map((factor) => ({ ...factor, evidence: factor.evidence })),
      ...relatedClusters.slice(0, 3).map((cluster) => ({
        feature: cluster.scenario,
        impact: cluster.riskScore,
        direction: "risk_increase" as const,
        evidence: `${cluster.title}: ${cluster.evidence.join(" ")}`,
      })),
      { feature: "kyc_risk", impact: kycRisk, direction: kycRisk >= 50 ? "risk_increase" as const : "risk_decrease" as const, evidence: `KYC status ${customer?.kycStatus ?? "unknown"} with score ${kycRisk}.` },
      { feature: "kyb_risk", impact: kybRisk, direction: kybRisk >= 50 ? "risk_increase" as const : "risk_decrease" as const, evidence: business ? `KYB status ${business.kybStatus} with score ${kybRisk}.` : "No linked business profile." },
      ...researchSignals.map((signal) => ({
        feature: signal.name,
        impact: signal.score,
        direction: "risk_increase" as const,
        evidence: `${signal.paper}: ${signal.evidence.join(" ")}`,
      })),
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 8);

    return {
      fraudRisk,
      amlRisk,
      unifiedRisk,
      riskLevel,
      decision,
      reasons: [...new Set([...rulesTriggered, ...fraudDecision.reasons, ...relatedClusters.map((cluster) => cluster.scenario)])].slice(0, 8),
      componentScores: scores,
      explainability,
      policyVersion: "AG-POLICY-AML-1.4",
      modelVersion: "AG-RISK-2026.1",
      confidence: Math.round(clamp(70 + explainability.length * 2 + relatedClusters.length * 4)),
      dataQualityWarnings: [
        ...(customer ? [] : ["No KYC profile found for customer"]),
        ...(transaction.businessId && !business ? ["No KYB profile found for business"] : []),
        ...(this.screeningChecks.some((check) => check.subjectId === transaction.customerId && check.resultStatus === "provider_unavailable") ? ["Screening source unavailable; manual verification required"] : []),
      ],
      rollingWindows,
      researchSignals,
    };
  }

  private createAlertForTransaction(transaction: AmlTransaction, decision: ReturnType<AmlService["scoreTransaction"]>) {
    if (decision.riskLevel !== "high" && decision.riskLevel !== "critical") return null;
    const alert: AmlAlert = {
      id: `aml-alert-${randomUUID().slice(0, 8)}`,
      category: transaction.rulesTriggered.includes("rule-sanctions-match") ? "screening" : "structuring",
      eventId: transaction.eventId,
      subjectId: transaction.businessId ?? transaction.customerId,
      subjectType: transaction.businessId ? "business" : "customer",
      relatedTransactions: [transaction.id, ...transaction.linkedTransactionIds].slice(0, 10),
      rulesTriggered: decision.reasons.filter((reason) => reason.startsWith("rule-")),
      riskScores: { fraud: decision.fraudRisk, aml: decision.amlRisk, unified: decision.unifiedRisk },
      cumulativeAmount: decision.rollingWindows.find((window) => window.window === "24h")?.totalAmount ?? transaction.baseCurrencyEquivalent,
      transactionCount: decision.rollingWindows.find((window) => window.window === "24h")?.transactionCount ?? 1,
      rollingWindow: "24h",
      explanation: decision.explainability[0]?.evidence ?? "High-risk AML transaction decision generated.",
      evidence: decision.explainability.map((factor) => factor.evidence).slice(0, 5),
      suggestedAction: this.recommendedAction(decision.unifiedRisk, decision.decision),
      status: "new",
      serviceLevelDeadline: minutesFromNow(decision.riskLevel === "critical" ? 60 : 240),
      relatedAlerts: [],
      relatedCases: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.alerts.unshift(alert);
    return alert;
  }

  private rulesForScenario(scenario: MicrotransactionCluster["scenario"]) {
    const map: Record<MicrotransactionCluster["scenario"], string[]> = {
      structuring: ["rule-structuring-24h", "rule-threshold-avoidance"],
      smurfing: ["rule-smurfing"],
      fan_in: ["rule-fan-in"],
      fan_out: ["rule-fan-out"],
      rapid_pass_through: ["rule-rapid-pass-through"],
      threshold_avoidance: ["rule-threshold-avoidance"],
      micro_deposit_testing: ["rule-account-testing"],
      machine_like: ["rule-account-testing"],
      dormant_reactivation: ["rule-dormant-reactivation"],
      mobile_money_consolidation: ["rule-mobile-money-consolidation"],
    };
    return map[scenario] ?? [];
  }

  private recommendedAction(score: number, decision: string) {
    if (decision === "hold" || decision === "block" || score >= 80) return "Hold or restrict movement and escalate to compliance or MLRO-equivalent review.";
    if (score >= 60) return "Open analyst review with KYC/KYB refresh and graph evidence.";
    if (score >= 35) return "Approve with enhanced monitoring and rule-performance feedback.";
    return "Approve and continue standard monitoring.";
  }

  private requireRule(id: string) {
    const rule = this.rules.find((item) => item.id === id);
    if (!rule) throw new NotFoundException(`AML rule ${id} was not found.`);
    return rule;
  }

  private requireAlert(id: string) {
    const alert = this.alerts.find((item) => item.id === id);
    if (!alert) throw new NotFoundException(`AML alert ${id} was not found.`);
    return alert;
  }

  private auditAction(actor: ActorContext, action: string, target: string, metadata: Record<string, unknown>) {
    this.audit.unshift(this.security.audit(actor.actor, actor.role, action, target, {
      ...metadata,
      requestId: `req-${randomUUID().slice(0, 8)}`,
      timestamp: nowIso(),
    }));
  }

  private blankScores(customer?: CustomerKycProfile, business?: BusinessKybProfile): AmlScoreBreakdown {
    return {
      deterministicRules: 0,
      mlAnomaly: 0,
      behaviouralProfile: 0,
      identityGraph: 0,
      consortiumIntelligence: 0,
      amlSanctions: 0,
      customerKyc: customer?.customerRiskScore ?? 0,
      businessKyb: business?.riskScore ?? 0,
      deviceRisk: 0,
      geographicRisk: 0,
      beneficiaryRisk: 0,
      transactionVelocity: 0,
      microtransactionCluster: 0,
      historicalOutcomes: 0,
    };
  }

  private sortValue(transaction: AmlTransaction, sortBy: string) {
    if (sortBy === "amount") return transaction.baseCurrencyEquivalent;
    if (sortBy === "risk" || sortBy === "unifiedRisk") return transaction.unifiedRisk;
    if (sortBy === "amlRisk") return transaction.amlRisk;
    if (sortBy === "fraudRisk") return transaction.fraudRisk;
    return transaction.timestamp;
  }

  private sum(transactions: AmlTransaction[]) {
    return Math.round(transactions.reduce((sum, transaction) => sum + transaction.baseCurrencyEquivalent, 0));
  }

  private levelFor(score: number): RiskLevel {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 30) return "medium";
    return "low";
  }

  private riskDistribution() {
    const groups: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const transaction of this.transactions) groups[this.levelFor(transaction.unifiedRisk)] += 1;
    return Object.entries(groups).map(([label, value]) => ({ label, value, risk: label as RiskLevel }));
  }

  private valueByRisk() {
    const groups: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const transaction of this.transactions) groups[this.levelFor(transaction.unifiedRisk)] += transaction.baseCurrencyEquivalent;
    return Object.entries(groups).map(([label, value]) => ({ label, value: Math.round(value), risk: label as RiskLevel }));
  }

  private timelinePoints(values: string[], label: string) {
    const buckets = new Map<string, number>();
    for (const value of values) {
      const date = new Date(value);
      const bucket = `${date.getHours().toString().padStart(2, "0")}:00`;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([bucket, value]) => ({ label: `${label} ${bucket}`, value }));
  }

  private scenarioPoints(clusters: MicrotransactionCluster[], scenario: MicrotransactionCluster["scenario"]) {
    return clusters.filter((cluster) => cluster.scenario === scenario).map((cluster) => ({ label: cluster.title, value: cluster.transactionCount, secondaryValue: cluster.cumulativeAmount, risk: cluster.riskLevel }));
  }

  private corridorPoints() {
    const corridors = new Map<string, { value: number; risk: number }>();
    for (const transaction of this.transactions) {
      const key = `${transaction.originCountry}-${transaction.destinationCountry}`;
      const existing = corridors.get(key) ?? { value: 0, risk: 0 };
      corridors.set(key, { value: existing.value + transaction.baseCurrencyEquivalent, risk: Math.max(existing.risk, transaction.unifiedRisk) });
    }
    return [...corridors.entries()]
      .map(([label, item]) => ({ label, value: Math.round(item.value), secondaryValue: item.risk, risk: this.levelFor(item.risk) }))
      .sort((a, b) => (b.secondaryValue ?? 0) - (a.secondaryValue ?? 0));
  }

  private ruleFrequency() {
    const counts = new Map<string, number>();
    for (const transaction of this.transactions) {
      for (const rule of transaction.rulesTriggered) counts.set(rule, (counts.get(rule) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }

  private alertOutcomePoints() {
    const counts = new Map<string, number>();
    for (const alert of this.alerts) counts.set(alert.status, (counts.get(alert.status) ?? 0) + 1);
    return [...counts.entries()].map(([label, value]) => ({ label, value }));
  }

  private investigationWorkload() {
    const counts = new Map<string, number>();
    for (const investigation of this.investigations) counts.set(investigation.owner, (counts.get(investigation.owner) ?? 0) + 1);
    return [...counts.entries()].map(([label, value]) => ({ label, value }));
  }

  private sanitizeCustomer(customer: CustomerKycProfile): CustomerKycProfile {
    const sanitized = structuredClone(customer);
    sanitized.fullLegalName = this.maskName(customer.fullLegalName);
    sanitized.previousNames = [];
    sanitized.dateOfBirth = this.maskDate(customer.dateOfBirth);
    sanitized.residentialAddress = "Restricted - audited reveal required";
    sanitized.telephoneNumber = this.maskPhone(customer.telephoneNumber);
    sanitized.emailAddress = this.maskEmail(customer.emailAddress);
    sanitized.employer = "Restricted - audited reveal required";
    sanitized.sourceOfFunds = "Restricted - permissioned review required";
    sanitized.sourceOfWealth = "Restricted - permissioned review required";
    sanitized.deviceInformation = customer.deviceInformation.map((device) => this.maskIdentifier(device));
    sanitized.edd = {
      ...sanitized.edd,
      supportingDocuments: sanitized.edd.supportingDocuments.map((document) => `${document} (restricted evidence)`),
      investigatorNotes: sanitized.edd.investigatorNotes.map(() => "Restricted investigation note"),
    };
    sanitized.checks = sanitized.checks.map((check) => ({
      ...check,
      evidence: this.safeEvidence(check.evidence),
    }));
    return sanitized;
  }

  private sanitizeBusiness(business: BusinessKybProfile): BusinessKybProfile {
    const sanitized = structuredClone(business);
    sanitized.legalName = this.maskName(business.legalName);
    sanitized.companyNumber = this.maskIdentifier(business.companyNumber);
    sanitized.registeredAddress = "Restricted - audited reveal required";
    sanitized.tradingAddress = "Restricted - audited reveal required";
    sanitized.website = business.website ? "Restricted - server-side KYB evidence" : "";
    sanitized.emailDomain = "restricted-domain";
    sanitized.directors = business.directors.map((director) => ({ ...director, name: this.maskName(director.name) }));
    sanitized.shareholders = business.shareholders.map((shareholder) => ({ ...shareholder, name: this.maskName(shareholder.name) }));
    sanitized.ultimateBeneficialOwners = business.ultimateBeneficialOwners.map((owner) => ({ ...owner, name: this.maskName(owner.name) }));
    sanitized.parentEntities = business.parentEntities.map((entity) => this.maskName(entity));
    sanitized.subsidiaries = business.subsidiaries.map((entity) => this.maskName(entity));
    sanitized.sourceOfBusinessFunds = "Restricted - permissioned review required";
    sanitized.licences = business.licences.map((licence) => this.maskIdentifier(licence));
    sanitized.taxInformation = "Restricted - audited reveal required";
    sanitized.ownershipGraph = {
      nodes: business.ownershipGraph.nodes.map((node) => ({
        ...node,
        label: ["director", "shareholder", "ubo", "address"].includes(node.type) ? "Restricted entity" : node.label,
      })),
      edges: business.ownershipGraph.edges,
    };
    return sanitized;
  }

  private sanitizeScreening(check: ScreeningCheck): ScreeningCheck {
    return {
      ...structuredClone(check),
      provider: "African Guard Screening Network",
      datasetVersion: "AG-SCREENING-CONTROLLED",
      reviewer: check.reviewer ? this.maskIdentifier(check.reviewer) : undefined,
      evidence: check.evidence.map((item) => this.safeEvidence(item)),
    };
  }

  private sanitizeRule(rule: AmlRule): AmlRule {
    const sanitized = structuredClone(rule);
    sanitized.comparisonValue = "restricted";
    sanitized.countThreshold = 0;
    sanitized.cumulativeThreshold = 0;
    sanitized.logic = {
      join: sanitized.logic.join,
      conditions: sanitized.logic.conditions.map((condition) => ({
        ...condition,
        value: "restricted",
      })),
    };
    sanitized.versionHistory = sanitized.versionHistory.map((entry) => ({
      ...entry,
      changedBy: this.maskIdentifier(entry.changedBy),
    }));
    return sanitized;
  }

  private sanitizeSarDraft(draft: SarDraft): SarDraft {
    const sanitized = structuredClone(draft);
    sanitized.accountIds = draft.accountIds.map((account) => this.maskIdentifier(account));
    sanitized.walletIds = draft.walletIds.map((wallet) => this.maskIdentifier(wallet));
    sanitized.transactionChronology = ["Restricted chronology - available only through audited SAR review."];
    sanitized.reasonForSuspicion = "Restricted SAR rationale - available only to authorised SAR reviewers.";
    sanitized.sourceOfFundsConcerns = ["Restricted source-of-funds analysis - permissioned review required."];
    sanitized.relatedEntities = draft.relatedEntities.map((entity) => this.maskIdentifier(entity));
    sanitized.narrative = "Restricted SAR narrative. Open an authorised SAR review workflow to view or edit the full draft.";
    sanitized.approvedBy = draft.approvedBy ? this.maskIdentifier(draft.approvedBy) : undefined;
    return sanitized;
  }

  private sanitizeAudit(event: AuditEvent): AuditEvent {
    return {
      ...event,
      actor: this.maskIdentifier(event.actor),
      metadata: Object.fromEntries(
        Object.entries(event.metadata).map(([key, value]) => {
          if (["previous", "next", "narrative", "prompt", "providerPayload"].includes(key)) return [key, "[restricted]"];
          if (typeof value === "string") return [key, this.safeEvidence(value)];
          return [key, value];
        }),
      ),
    };
  }

  private maskName(value: string) {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1)}${"*".repeat(Math.min(Math.max(part.length - 1, 2), 8))}`)
      .join(" ");
  }

  private maskEmail(value: string) {
    const [local, domain] = value.split("@");
    return `${local?.slice(0, 1) || "u"}***@${domain || "restricted.example"}`;
  }

  private maskPhone(value: string) {
    return value.startsWith("+") ? "+*** *** ***" : "*** *** ***";
  }

  private maskDate(value: string) {
    const year = value.slice(0, 4);
    return year ? `${year}-**-**` : "****-**-**";
  }

  private maskIdentifier(value: string) {
    if (!value) return "restricted";
    return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
  }

  private safeEvidence(value: string) {
    return value
      .replace(/provider/gi, "screening source")
      .replace(/adapter/gi, "connector")
      .replace(/credentials?/gi, "secure configuration")
      .replace(/AI-generated/gi, "Decision Intelligence")
      .replace(/hybrid-risk-[\w.-]+/gi, "AG-RISK-2026.1");
  }

  private mergeClusters(seed: MicrotransactionCluster[], detected: MicrotransactionCluster[]) {
    const map = new Map<string, MicrotransactionCluster>();
    for (const cluster of [...seed, ...detected]) map.set(cluster.id, cluster);
    return [...map.values()].sort((a, b) => b.riskScore - a.riskScore);
  }
}
