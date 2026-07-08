import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "../../domain";
import { Roles } from "../security/roles.decorator";
import { AmlService } from "./aml.service";
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

const actorFrom = (headers: Record<string, string | string[] | undefined>) => {
  const value = headers["x-actor"];
  return Array.isArray(value) ? value[0] ?? "local-user" : value ?? "local-user";
};

const roleFrom = (headers: Record<string, string | string[] | undefined>) => {
  const value = headers["x-role"];
  return ((Array.isArray(value) ? value[0] : value) ?? "admin") as UserRole;
};

const contextFrom = (headers: Record<string, string | string[] | undefined>) => ({
  actor: actorFrom(headers),
  role: roleFrom(headers),
});

@Controller("aml")
export class AmlController {
  constructor(private readonly aml: AmlService) {}

  @Get("workspace")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "rule_administrator", "internal_auditor", "admin")
  workspace() {
    return this.aml.workspace();
  }

  @Get("overview")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  overview() {
    return this.aml.overview();
  }

  @Get("transactions")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  transactions(@Query() query: ListAmlTransactionsQueryDto) {
    return this.aml.listTransactions(query);
  }

  @Get("transactions/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  transaction(@Param("id") id: string) {
    return this.aml.transaction(id);
  }

  @Post("transactions/evaluate")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  evaluateTransaction(
    @Body() body: EvaluateAmlTransactionDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.aml.evaluateTransaction(body, contextFrom(headers));
  }

  @Post("transactions/batch-evaluate")
  @Roles("fraud_investigator", "compliance_officer", "admin")
  batchEvaluate(
    @Body() body: BatchEvaluateAmlTransactionsDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.aml.batchEvaluate(body, contextFrom(headers));
  }

  @Get("microtransactions/clusters")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  microtransactionClusters() {
    return this.aml.microtransactionClusters();
  }

  @Get("microtransactions/:clusterId")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  microtransactionCluster(@Param("clusterId") id: string) {
    return this.aml.microtransactionCluster(id);
  }

  @Get("customers")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  customers() {
    return this.aml.customersList();
  }

  @Get("customers/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  customer(@Param("id") id: string) {
    return this.aml.customer(id);
  }

  @Post("customers/:id/assess")
  @Roles("compliance_officer", "mlro", "admin")
  assessCustomer(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.assessCustomer(id, contextFrom(headers));
  }

  @Post("customers/:id/refresh")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  refreshCustomer(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.refreshCustomer(id, contextFrom(headers));
  }

  @Get("businesses")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  businesses() {
    return this.aml.businessesList();
  }

  @Get("businesses/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  business(@Param("id") id: string) {
    return this.aml.business(id);
  }

  @Post("businesses/:id/assess")
  @Roles("compliance_officer", "mlro", "admin")
  assessBusiness(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.assessBusiness(id, contextFrom(headers));
  }

  @Post("businesses/:id/refresh")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  refreshBusiness(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.refreshBusiness(id, contextFrom(headers));
  }

  @Post("screening")
  @Roles("compliance_officer", "mlro", "admin")
  createScreening(@Body() body: ScreeningRequestDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.createScreening(body, contextFrom(headers));
  }

  @Get("screening/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  screening(@Param("id") id: string) {
    return this.aml.screening(id);
  }

  @Get("rules")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "rule_administrator", "internal_auditor", "admin")
  rules() {
    return this.aml.rulesList();
  }

  @Post("rules")
  @Roles("rule_administrator", "admin")
  createRule(@Body() body: CreateAmlRuleDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.createRule(body, contextFrom(headers));
  }

  @Patch("rules/:id")
  @Roles("rule_administrator", "admin")
  patchRule(@Param("id") id: string, @Body() body: PatchAmlRuleDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.patchRule(id, body, contextFrom(headers));
  }

  @Post("rules/:id/test")
  @Roles("rule_administrator", "compliance_officer", "admin")
  testRule(@Param("id") id: string) {
    return this.aml.testRule(id);
  }

  @Post("rules/:id/backtest")
  @Roles("rule_administrator", "compliance_officer", "admin")
  backtestRule(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.backtestRule(id, contextFrom(headers));
  }

  @Post("rules/:id/approve")
  @Roles("compliance_officer", "mlro", "admin")
  approveRule(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.approveRule(id, contextFrom(headers));
  }

  @Post("rules/:id/activate")
  @Roles("compliance_officer", "mlro", "admin")
  activateRule(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.activateRule(id, contextFrom(headers));
  }

  @Post("rules/:id/deactivate")
  @Roles("compliance_officer", "mlro", "admin")
  deactivateRule(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.deactivateRule(id, contextFrom(headers));
  }

  @Get("alerts")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  alerts() {
    return this.aml.alertsList();
  }

  @Get("alerts/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "internal_auditor", "admin")
  alert(@Param("id") id: string) {
    return this.aml.alert(id);
  }

  @Patch("alerts/:id")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  patchAlert(@Param("id") id: string, @Body() body: PatchAmlAlertDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.patchAlert(id, body, contextFrom(headers));
  }

  @Post("alerts/:id/assign")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  assignAlert(@Param("id") id: string, @Body() body: AssignAmlAlertDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.assignAlert(id, body, contextFrom(headers));
  }

  @Post("alerts/:id/escalate")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  escalateAlert(@Param("id") id: string, @Body() body: AmlActionReasonDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.escalateAlert(id, body, contextFrom(headers));
  }

  @Post("alerts/:id/convert-to-case")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  convertAlert(@Param("id") id: string, @Body() body: AmlActionReasonDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.convertAlertToCase(id, body, contextFrom(headers));
  }

  @Post("alerts/:id/close")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  closeAlert(@Param("id") id: string, @Body() body: CloseAmlAlertDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.closeAlert(id, body, contextFrom(headers));
  }

  @Get("sar-drafts")
  @Roles("compliance_officer", "mlro", "internal_auditor", "admin")
  sarDrafts() {
    return this.aml.sarDraftsList();
  }

  @Post("sar-drafts")
  @Roles("compliance_officer", "mlro", "admin")
  createSarDraft(@Body() body: CreateSarDraftDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.createSarDraft(body, contextFrom(headers));
  }

  @Post("sar-drafts/:id/approve")
  @Roles("mlro", "admin")
  approveSarDraft(@Param("id") id: string, @Body() body: AmlActionReasonDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.aml.approveSarDraft(id, body, contextFrom(headers));
  }

  @Get("audit")
  @Roles("internal_auditor", "compliance_officer", "mlro", "admin")
  audit() {
    return this.aml.auditList();
  }
}
