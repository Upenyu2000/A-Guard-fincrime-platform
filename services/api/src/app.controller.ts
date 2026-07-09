import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { DataStoreService } from "./data-store.service";
import { FraudEventInput, CaseStatus, UserRole } from "./domain";
import { FraudEngineService } from "./modules/fraud/fraud-engine.service";
import { AuthenticatedUser } from "./modules/security/rbac.guard";
import { Roles } from "./modules/security/roles.decorator";

type RequestWithUser = {
  user?: AuthenticatedUser;
};

const actorFrom = (request: RequestWithUser) => request.user?.actor ?? "system";
const roleFrom = (request: RequestWithUser) => {
  return (request.user?.role ?? "admin") as UserRole;
};

@Controller()
export class AppController {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly fraudEngine: FraudEngineService,
  ) {}

  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Get("operating-picture")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin", "institution_partner")
  operatingPicture() {
    return this.dataStore.operatingPicture();
  }

  @Post("events/score")
  @Roles("analyst", "fraud_investigator", "admin", "institution_partner")
  scoreEvent(@Body() body: FraudEventInput) {
    const decision = this.fraudEngine.scoreEvent(body);
    const persistence = this.dataStore.ingestEvent(body, decision);
    return {
      ...decision,
      event_id: persistence.eventId,
      alert: persistence.alert,
    };
  }

  @Get("intelligence/network")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin", "institution_partner")
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
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  payments() {
    return this.dataStore.operatingPicture().payments;
  }

  @Post("payments/:id/recall")
  @Roles("fraud_investigator", "compliance_officer", "admin")
  recallPayment(
    @Param("id") id: string,
    @Req() request: RequestWithUser,
  ) {
    return this.dataStore.recallPayment(id, actorFrom(request), roleFrom(request));
  }

  @Get("cases")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  cases() {
    return this.dataStore.operatingPicture().cases;
  }

  @Get("cases/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  case(@Param("id") id: string) {
    return this.dataStore.caseById(id);
  }

  @Post("cases/:id/status")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  updateCaseStatus(
    @Param("id") id: string,
    @Body() body: { status: CaseStatus },
    @Req() request: RequestWithUser,
  ) {
    return this.dataStore.updateCaseStatus(id, body.status, actorFrom(request), roleFrom(request));
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
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  graph() {
    return this.dataStore.operatingPicture().graph;
  }

  @Get("aml/customers")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
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
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "admin", "institution_partner")
  training() {
    return this.dataStore.trainingAcademy();
  }
}
