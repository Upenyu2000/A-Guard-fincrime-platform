import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AuditLogService } from "../audit-log-service/audit-log-service.service";
import { CurrentPrincipal } from "../security/current-principal.decorator";
import { Public } from "../security/public.decorator";
import { Roles } from "../security/roles.decorator";
import { Scopes } from "../security/scopes.decorator";
import { AuthenticatedPrincipal } from "../security/auth.types";
import {
  CreateLiveApiKeyDto,
  CreateLiveCaseDto,
  CreateLiveIntegrationDto,
  CursorQueryDto,
  IngestLiveTransactionDto,
} from "./live.dto";
import { LiveOperationsService } from "./live-operations.service";
import { LiveReadinessService } from "./live-readiness.service";

@Controller("live")
export class LiveController {
  constructor(
    private readonly operations: LiveOperationsService,
    private readonly readiness: LiveReadinessService,
    private readonly audit: AuditLogService,
  ) {}

  @Get("health/live")
  @Public()
  liveness() {
    return this.readiness.liveness();
  }

  @Get("health/ready")
  @Public()
  async ready() {
    const result = await this.readiness.readiness();
    if (result.status !== "ready") throw new ServiceUnavailableException(result);
    return result;
  }

  @Get("integrations")
  @Roles("admin", "developer", "auditor")
  @Scopes("integrations.read")
  integrations(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: CursorQueryDto,
  ) {
    return this.operations.listIntegrations(principal.tenantId, query.limit, query.cursor);
  }

  @Post("integrations")
  @Roles("admin", "developer")
  @Scopes("integrations.write")
  createIntegration(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: CreateLiveIntegrationDto,
  ) {
    return this.operations.createIntegration(principal, body);
  }

  @Post("api-keys")
  @Roles("admin", "developer")
  @Scopes("api_keys.write")
  createApiKey(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: CreateLiveApiKeyDto,
  ) {
    return this.operations.createApiKey(principal, body);
  }

  @Get("transactions")
  @Roles("admin", "analyst", "fraud_investigator", "reviewer", "auditor")
  @Scopes("transactions.read")
  transactions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: CursorQueryDto,
  ) {
    return this.operations.listTransactions(principal.tenantId, query.limit, query.cursor);
  }

  @Post("transactions")
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin", "developer", "institution_partner")
  @Scopes("transactions.write")
  ingestTransaction(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: IngestLiveTransactionDto,
    @Headers("idempotency-key") idempotencyKey: string,
  ) {
    return this.operations.ingestTransaction(principal, body, idempotencyKey);
  }

  @Get("cases")
  @Roles("admin", "analyst", "investigator", "fraud_investigator", "reviewer", "auditor")
  @Scopes("cases.read")
  cases(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: CursorQueryDto,
  ) {
    return this.operations.listCases(principal.tenantId, query.limit, query.cursor);
  }

  @Post("cases")
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin", "investigator", "fraud_investigator")
  @Scopes("cases.write")
  createCase(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: CreateLiveCaseDto,
  ) {
    return this.operations.createCase(principal, body);
  }

  @Get("audit/verify")
  @Roles("admin", "auditor", "compliance_officer")
  @Scopes("audit.verify")
  verifyAudit(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.audit.verifyChain(principal.tenantId);
  }
}
