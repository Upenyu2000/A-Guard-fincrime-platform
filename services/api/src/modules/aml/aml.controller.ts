import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { UserRole } from "../../domain";
import { AuthenticatedUser } from "../security/rbac.guard";
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

type RequestWithUser = {
  user?: AuthenticatedUser;
};

const contextFrom = (request: RequestWithUser) => ({
  actor: request.user?.actor ?? "system",
  role: (request.user?.role ?? "admin") as UserRole,
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
    @Req() request: RequestWithUser,
  ) {
    return this.aml.evaluateTransaction(body, contextFrom(request));
  }

  @Post("transactions/batch-evaluate")
  @Roles("fraud_investigator", "compliance_officer", "admin")
  batchEvaluate(
    @Body() body: BatchEvaluateAmlTransactionsDto,
    @Req() request: RequestWithUser,
  ) {
    return this.aml.batchEvaluate(body, contextFrom(request));
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
  assessCustomer(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.assessCustomer(id, contextFrom(request));
  }

  @Post("customers/:id/refresh")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  refreshCustomer(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.refreshCustomer(id, contextFrom(request));
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
  assessBusiness(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.assessBusiness(id, contextFrom(request));
  }

  @Post("businesses/:id/refresh")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  refreshBusiness(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.refreshBusiness(id, contextFrom(request));
  }

  @Post("screening")
  @Roles("compliance_officer", "mlro", "admin")
  createScreening(@Body() body: ScreeningRequestDto, @Req() request: RequestWithUser) {
    return this.aml.createScreening(body, contextFrom(request));
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
  createRule(@Body() body: CreateAmlRuleDto, @Req() request: RequestWithUser) {
    return this.aml.createRule(body, contextFrom(request));
  }

  @Patch("rules/:id")
  @Roles("rule_administrator", "admin")
  patchRule(@Param("id") id: string, @Body() body: PatchAmlRuleDto, @Req() request: RequestWithUser) {
    return this.aml.patchRule(id, body, contextFrom(request));
  }

  @Post("rules/:id/test")
  @Roles("rule_administrator", "compliance_officer", "admin")
  testRule(@Param("id") id: string) {
    return this.aml.testRule(id);
  }

  @Post("rules/:id/backtest")
  @Roles("rule_administrator", "compliance_officer", "admin")
  backtestRule(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.backtestRule(id, contextFrom(request));
  }

  @Post("rules/:id/approve")
  @Roles("compliance_officer", "mlro", "admin")
  approveRule(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.approveRule(id, contextFrom(request));
  }

  @Post("rules/:id/activate")
  @Roles("compliance_officer", "mlro", "admin")
  activateRule(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.activateRule(id, contextFrom(request));
  }

  @Post("rules/:id/deactivate")
  @Roles("compliance_officer", "mlro", "admin")
  deactivateRule(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.aml.deactivateRule(id, contextFrom(request));
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
  patchAlert(@Param("id") id: string, @Body() body: PatchAmlAlertDto, @Req() request: RequestWithUser) {
    return this.aml.patchAlert(id, body, contextFrom(request));
  }

  @Post("alerts/:id/assign")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "admin")
  assignAlert(@Param("id") id: string, @Body() body: AssignAmlAlertDto, @Req() request: RequestWithUser) {
    return this.aml.assignAlert(id, body, contextFrom(request));
  }

  @Post("alerts/:id/escalate")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  escalateAlert(@Param("id") id: string, @Body() body: AmlActionReasonDto, @Req() request: RequestWithUser) {
    return this.aml.escalateAlert(id, body, contextFrom(request));
  }

  @Post("alerts/:id/convert-to-case")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  convertAlert(@Param("id") id: string, @Body() body: AmlActionReasonDto, @Req() request: RequestWithUser) {
    return this.aml.convertAlertToCase(id, body, contextFrom(request));
  }

  @Post("alerts/:id/close")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "admin")
  closeAlert(@Param("id") id: string, @Body() body: CloseAmlAlertDto, @Req() request: RequestWithUser) {
    return this.aml.closeAlert(id, body, contextFrom(request));
  }

  @Get("sar-drafts")
  @Roles("compliance_officer", "mlro", "internal_auditor", "admin")
  sarDrafts() {
    return this.aml.sarDraftsList();
  }

  @Post("sar-drafts")
  @Roles("compliance_officer", "mlro", "admin")
  createSarDraft(@Body() body: CreateSarDraftDto, @Req() request: RequestWithUser) {
    return this.aml.createSarDraft(body, contextFrom(request));
  }

  @Post("sar-drafts/:id/approve")
  @Roles("mlro", "admin")
  approveSarDraft(@Param("id") id: string, @Body() body: AmlActionReasonDto, @Req() request: RequestWithUser) {
    return this.aml.approveSarDraft(id, body, contextFrom(request));
  }

  @Get("audit")
  @Roles("internal_auditor", "compliance_officer", "mlro", "admin")
  audit() {
    return this.aml.auditList();
  }

  @Get("training/courses")
  @Roles("analyst", "fraud_investigator", "compliance_officer", "mlro", "rule_administrator", "internal_auditor", "admin")
  trainingCourses() {
    return this.aml.finraCourseList();
  }

  @Get("research/papers")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "rule_administrator", "internal_auditor", "admin")
  researchPapers() {
    return this.aml.researchPaperList();
  }

  @Get("research/implementations")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "rule_administrator", "internal_auditor", "admin")
  researchImplementations() {
    return this.aml.researchImplementationList();
  }

  @Get("research/repositories")
  @Roles("fraud_investigator", "compliance_officer", "mlro", "rule_administrator", "internal_auditor", "admin")
  repositoryReviews() {
    return this.aml.repositoryReviewList();
  }
}
