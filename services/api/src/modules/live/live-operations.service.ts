import { Injectable } from "@nestjs/common";
import { AuthenticatedPrincipal } from "../security/auth.types";
import {
  CreateLiveApiKeyDto,
  CreateLiveCaseDto,
  CreateLiveIntegrationDto,
  IngestLiveTransactionDto,
} from "./live.dto";
import { LiveCaseService } from "./live-case.service";
import { LiveIntegrationService } from "./live-integration.service";
import { LiveTransactionService } from "./live-transaction.service";

@Injectable()
export class LiveOperationsService {
  constructor(
    private readonly integrations: LiveIntegrationService,
    private readonly transactions: LiveTransactionService,
    private readonly cases: LiveCaseService,
  ) {}

  listIntegrations(tenantId: string, limit: number, cursor?: string) {
    return this.integrations.list(tenantId, limit, cursor);
  }

  createIntegration(principal: AuthenticatedPrincipal, dto: CreateLiveIntegrationDto) {
    return this.integrations.create(principal, dto);
  }

  createApiKey(principal: AuthenticatedPrincipal, dto: CreateLiveApiKeyDto) {
    return this.integrations.createApiKey(principal, dto);
  }

  ingestTransaction(
    principal: AuthenticatedPrincipal,
    dto: IngestLiveTransactionDto,
    idempotencyKey: string,
  ) {
    return this.transactions.ingest(principal, dto, idempotencyKey);
  }

  listTransactions(tenantId: string, limit: number, cursor?: string) {
    return this.transactions.list(tenantId, limit, cursor);
  }

  createCase(principal: AuthenticatedPrincipal, dto: CreateLiveCaseDto) {
    return this.cases.create(principal, dto);
  }

  listCases(tenantId: string, limit: number, cursor?: string) {
    return this.cases.list(tenantId, limit, cursor);
  }
}
