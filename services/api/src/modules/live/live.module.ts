import { Module } from "@nestjs/common";
import { ApiKeyService } from "../api-key-service/api-key-service.service";
import { AuditLogService } from "../audit-log-service/audit-log-service.service";
import { PrismaService } from "../database/prisma.service";
import { LiveCaseService } from "./live-case.service";
import { LiveController } from "./live.controller";
import { LiveIntegrationService } from "./live-integration.service";
import { LiveOperationsService } from "./live-operations.service";
import { LiveReadinessService } from "./live-readiness.service";
import { LiveRiskScoringService } from "./live-risk-scoring.service";
import { LiveTransactionService } from "./live-transaction.service";
import { OutboxDispatcherService } from "./outbox-dispatcher.service";

@Module({
  controllers: [LiveController],
  providers: [
    PrismaService,
    ApiKeyService,
    AuditLogService,
    LiveRiskScoringService,
    LiveIntegrationService,
    LiveTransactionService,
    LiveCaseService,
    LiveOperationsService,
    LiveReadinessService,
    OutboxDispatcherService,
  ],
  exports: [PrismaService, ApiKeyService, AuditLogService, LiveReadinessService],
})
export class LiveModule {}
