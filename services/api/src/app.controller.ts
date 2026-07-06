import { BadRequestException, Body, Controller, Get, Header, Headers, Param, Post } from "@nestjs/common";
import { DataStoreService } from "./data-store.service";
import { AgentAutonomyMode, CaseStatus, FraudEventInput, UserRole, eventTypes } from "./domain";
import { FraudEngineService } from "./modules/fraud/fraud-engine.service";
import { Roles } from "./modules/security/roles.decorator";

const actorFrom = (headers: Record<string, string | string[] | undefined>) => {
  const value = headers["x-actor"];
  return Array.isArray(value) ? value[0] ?? "local-user" : value ?? "local-user";
};

const roleFrom = (headers: Record<string, string | string[] | undefined>) => {
  const value = headers["x-role"];
  return ((Array.isArray(value) ? value[0] : value) ?? "admin") as UserRole;
};

@Controller()
export class AppController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly fraudEngine: FraudEngineService,
  ) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      service: "african-guard-api",
      architecture: ["NestJS", "WebSockets", "Prisma", "Redis", "Kafka", "Neo4j"],
      timestamp: new Date().toISOString(),
    };
  }

  @Get("operating-picture")
  operatingPicture() {
    return this.dataStore.operatingPicture();
  }

  @Post("events/score")
  @Roles("analyst", "fraud_investigator", "admin", "institution_partner")
  scoreEvent(@Body() body: FraudEventInput) {
    this.validateFraudEvent(body);
    const decision = this.fraudEngine.scoreEvent(body);
    const persistence = this.dataStore.ingestEvent(body, decision);
    return {
      ...decision,
      event_id: persistence.eventId,
      alert: persistence.alert,
    };
  }

  @Get("intelligence/network")
  network() {
    const picture = this.dataStore.operatingPicture();
    return {
      institutions: picture.institutions,
      typologies: picture.typologies,
      graph: picture.graph,
      privacyControls: [
        "HMAC pseudonymisation before consortium sharing",
        "AES-256-GCM encrypted alert envelopes",
        "No raw account, phone, email, IP, or identity values in partner payloads",
        "Trust-weighted institution reputation scoring",
      ],
    };
  }

  @Get("intelligence/alerts/:id/package")
  @Roles("fraud_investigator", "compliance_officer", "admin", "institution_partner")
  consortiumPackage(@Param("id") id: string) {
    return this.dataStore.consortiumPackage(id);
  }

  @Get("payments")
  payments() {
    return this.dataStore.operatingPicture().payments;
  }

  @Post("payments/:id/recall")
  @Roles("fraud_investigator", "compliance_officer", "admin")
  recallPayment(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.recallPayment(id, actorFrom(headers), roleFrom(headers));
  }

  @Get("cases")
  cases() {
    return this.dataStore.operatingPicture().cases;
  }

  @Get("cases/:id")
  case(@Param("id") id: string) {
    return this.dataStore.caseById(id);
  }

  @Post("cases/:id/status")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  updateCaseStatus(
    @Param("id") id: string,
    @Body() body: { status: CaseStatus },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.updateCaseStatus(id, body.status, actorFrom(headers), roleFrom(headers));
  }

  @Get("cases/:id/copilot")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  copilot(@Param("id") id: string) {
    return this.dataStore.copilot(id);
  }

  @Post("cases/:id/chat")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  chat(@Param("id") id: string, @Body() body: { prompt: string }) {
    return this.dataStore.chat(id, body.prompt ?? "Explain this fraud case");
  }

  @Get("graph")
  graph() {
    return this.dataStore.operatingPicture().graph;
  }

  @Get("aml/customers")
  amlCustomers() {
    return this.dataStore.operatingPicture().amlCustomers;
  }

  @Post("learning/feedback")
  @Roles("analyst", "fraud_investigator", "admin")
  feedback(
    @Body()
    body: {
      caseId: string;
      label: "confirmed_fraud" | "false_positive" | "recovered" | "needs_more_review";
      analyst: string;
      notes: string;
    },
  ) {
    return this.dataStore.recordFeedback(body);
  }

  @Get("security/audit")
  @Roles("compliance_officer", "admin")
  audit() {
    return this.dataStore.operatingPicture().audit;
  }

  @Get("agents/ops")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin", "institution_partner")
  agenticOps() {
    return this.dataStore.agenticOperations();
  }

  @Post("agents/run")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  runAgent(@Body() body: { agentId?: string; prompt: string; entityName?: string }) {
    return this.dataStore.runAgent({
      agentId: body.agentId,
      prompt: body.prompt ?? "Review activity from the last 30 days and identify potential account takeover cases.",
      entityName: body.entityName,
    });
  }

  @Post("agents/osint")
  @Roles("fraud_investigator", "compliance_officer", "admin")
  osint(@Body() body: { entityName: string }) {
    return this.dataStore.osintSearch(body.entityName ?? "Velo Digital Goods");
  }

  @Get("training")
  training() {
    return this.dataStore.trainingAcademy();
  }

  @Get("integrations")
  @Roles("admin", "developer", "auditor", "fraud_investigator", "analyst")
  integrations() {
    return this.dataStore.integrationsDashboard();
  }

  @Post("integrations")
  @Roles("admin", "developer")
  createIntegration(
    @Body()
    body: {
      tenantId: string;
      name: string;
      adapterId: string;
      type: "open_banking" | "bank_api" | "visa" | "mastercard" | "card_processor" | "psp" | "internal_api" | "demo_provider";
      environment?: "sandbox" | "production";
      authMethods: Array<"api_key" | "oauth2" | "open_banking_consent" | "mtls" | "signed_webhook">;
      scopes: string[];
      apiSecret?: string;
      webhookUrl?: string;
      fieldMappings?: Array<{ sourceField: string; targetField: string; required: boolean; transform?: string }>;
    },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.createIntegration(body, actorFrom(headers), roleFrom(headers));
  }

  @Post("integrations/:id/test")
  @Roles("admin", "developer")
  testIntegration(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.testIntegration(id, actorFrom(headers), roleFrom(headers));
  }

  @Get("payment-networks")
  @Roles("admin", "developer", "auditor", "fraud_investigator", "analyst")
  paymentNetworks() {
    const enterprise = this.dataStore.enterpriseSnapshot();
    return {
      adapters: enterprise.adapters,
      integrations: enterprise.integrations.filter((item) =>
        ["visa", "mastercard", "card_processor", "psp", "open_banking"].includes(item.type),
      ),
    };
  }

  @Get("developer/api-keys")
  @Roles("admin", "developer", "auditor")
  apiKeys() {
    return this.dataStore.enterpriseSnapshot().apiKeys;
  }

  @Post("developer/api-keys")
  @Roles("admin", "developer")
  createApiKey(
    @Body() body: { tenantId: string; name: string; scopes: string[]; expiresAt?: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.createApiKey(body, actorFrom(headers), roleFrom(headers));
  }

  @Get("transactions/monitoring")
  @Roles("admin", "analyst", "fraud_investigator", "reviewer", "auditor")
  transactionMonitoring() {
    return this.dataStore.enterpriseSnapshot().transactions;
  }

  @Post("transactions/ingest")
  @Roles("admin", "developer", "institution_partner")
  ingestTransaction(
    @Body()
    body: {
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
      rail?: "open_banking" | "ach" | "wire" | "rtp" | "sepa" | "visa" | "mastercard" | "debit_card" | "credit_card" | "psp" | "internal";
      signals?: FraudEventInput["signals"];
    },
  ) {
    if (!body.integrationId || !body.customerId || typeof body.amount !== "number") {
      throw new BadRequestException("integrationId, customerId, and numeric amount are required.");
    }

    const decision = this.fraudEngine.scoreEvent({
      event_type: "transaction",
      user_id: body.customerId,
      institution_id: "inst-afb",
      amount: body.amount,
      currency: body.currency,
      account_id: body.accountId,
      device_id: body.deviceId,
      beneficiary_id: body.beneficiaryId,
      merchant_id: body.merchantId,
      ip_address: body.ipAddress,
      channel: "api",
      signals: body.signals,
    });
    const record = this.dataStore.ingestTransaction(body, decision);
    return { record, decision };
  }

  @Post("webhooks/:integrationId")
  receiveWebhook(@Param("integrationId") integrationId: string, @Body() body: Record<string, unknown>) {
    return this.dataStore.receiveWebhook(integrationId, body);
  }

  @Post("osint/identity-search")
  @Roles("admin", "investigator", "fraud_investigator", "compliance_officer")
  osintIdentitySearch(
    @Body()
    body: {
      tenantId: string;
      caseId: string;
      investigatorId: string;
      lawfulBasis: string;
      purpose: string;
      permissionLevel: "standard" | "enhanced" | "supervised";
      query: Record<string, unknown>;
    },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.lawfulOsintSearch(
      {
        ...body,
        query: body.query,
      },
      actorFrom(headers),
      roleFrom(headers),
    );
  }

  @Get("evidence")
  @Roles("admin", "investigator", "fraud_investigator", "reviewer", "auditor")
  evidence() {
    return this.dataStore.enterpriseSnapshot().evidence;
  }

  @Post("evidence/capture")
  @Roles("admin", "investigator", "fraud_investigator")
  captureEvidence(
    @Body()
    body: {
      tenantId: string;
      caseId: string;
      type: "screenshot" | "document" | "transaction" | "webpage" | "note" | "graph";
      title: string;
      sourceUrl?: string;
      capturedBy: string;
      quality: "confirmed" | "probable" | "possible" | "needs_verification";
      retentionExpiresAt: string;
    },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.captureEvidence(body, actorFrom(headers), roleFrom(headers));
  }

  @Get("audit/export")
  @Roles("admin", "auditor", "compliance_officer")
  auditExport() {
    return this.dataStore.auditExport();
  }

  @Get("compliance/governance")
  @Roles("admin", "auditor", "compliance_officer", "reviewer")
  complianceGovernance() {
    return this.dataStore.enterpriseSnapshot().governance;
  }

  @Get("openapi.json")
  openApi() {
    return {
      openapi: "3.1.0",
      info: {
        title: "African Guard API",
        version: "0.2.0",
        description: "Fraud intelligence, integrations, transaction monitoring, AgentOps, OSINT, evidence, and compliance APIs.",
      },
      paths: {
        "/v1/events/score": { post: { summary: "Score a real-time fraud event" } },
        "/v1/integrations": { get: { summary: "List integrations" }, post: { summary: "Create a secure integration" } },
        "/v1/integrations/{id}/test": { post: { summary: "Test integration connectivity and mapping" } },
        "/v1/transactions/ingest": { post: { summary: "Ingest and score a transaction" } },
        "/v1/transactions/monitoring": { get: { summary: "List monitored transactions" } },
        "/v1/developer/api-keys": { get: { summary: "List API keys" }, post: { summary: "Create API key" } },
        "/v1/webhooks/{integrationId}": { post: { summary: "Receive signed provider webhook" } },
        "/v1/osint/identity-search": { post: { summary: "Run lawful OSINT and identity tracing search" } },
        "/v1/evidence/capture": { post: { summary: "Capture evidence with chain of custody" } },
        "/v1/audit/export": { get: { summary: "Export audit trail" } },
        "/v1/compliance/governance": { get: { summary: "List compliance controls" } },
      },
    };
  }

  @Get("agentops/control-plane")
  @Roles("fraud_investigator", "compliance_officer", "admin", "institution_partner")
  agentOpsControlPlane() {
    return this.dataStore.agentOpsControlPlane();
  }

  @Post("agentops/run-cycle")
  @Roles("fraud_investigator", "admin")
  runAgentOpsCycle(@Headers() headers: Record<string, string | string[] | undefined>) {
    return this.dataStore.runAgenticDefenseCycle(actorFrom(headers), roleFrom(headers));
  }

  @Post("agentops/actions/:id/approve")
  @Roles("fraud_investigator", "compliance_officer", "admin")
  approveAgentAction(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.approveAgentAction(id, actorFrom(headers), roleFrom(headers));
  }

  @Post("agentops/autonomy")
  @Roles("admin")
  setAutonomy(
    @Body() body: { mode: AgentAutonomyMode },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.dataStore.setAutonomyMode(body.mode, actorFrom(headers), roleFrom(headers));
  }

  @Get("deployment/readiness")
  readiness() {
    return this.dataStore.deploymentReadiness();
  }

  @Get("metrics")
  @Header("content-type", "text/plain; version=0.0.4")
  metrics() {
    return this.dataStore.prometheusMetrics();
  }

  private validateFraudEvent(body: FraudEventInput) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Fraud event body is required.");
    }

    if (!eventTypes.includes(body.event_type)) {
      throw new BadRequestException(`event_type must be one of: ${eventTypes.join(", ")}.`);
    }

    if (!body.user_id || !body.institution_id) {
      throw new BadRequestException("user_id and institution_id are required.");
    }
  }
}
