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
