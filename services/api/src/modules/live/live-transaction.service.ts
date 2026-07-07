import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Decision,
  IntegrationStatus,
  Prisma,
  ProcessingStatus,
  RiskLevel,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { AuditLogService } from "../audit-log-service/audit-log-service.service";
import { PrismaService } from "../database/prisma.service";
import { AuthenticatedPrincipal } from "../security/auth.types";
import { IngestLiveTransactionDto } from "./live.dto";
import { LiveRiskScoringService } from "./live-risk-scoring.service";

@Injectable()
export class LiveTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riskScoring: LiveRiskScoringService,
    private readonly audit: AuditLogService,
  ) {}

  async ingest(
    principal: AuthenticatedPrincipal,
    dto: IngestLiveTransactionDto,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 200) {
      throw new ConflictException("A valid Idempotency-Key header is required.");
    }
    await this.prisma.ensureConnected();
    const requestHash = this.hash(dto);
    const previous = await this.prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_operation_key: {
          tenantId: principal.tenantId,
          operation: "transactions.ingest",
          key: idempotencyKey,
        },
      },
    });
    if (previous) {
      if (previous.requestHash !== requestHash) {
        throw new ConflictException("Idempotency key was already used with different data.");
      }
      if (previous.responseBody) return previous.responseBody;
      throw new ConflictException("The idempotent operation is still being processed.");
    }

    const integration = await this.prisma.integrationConnection.findFirst({
      where: { id: dto.integrationId, tenantId: principal.tenantId },
    });
    if (!integration) throw new NotFoundException("Integration was not found for this tenant.");
    if (![IntegrationStatus.CONNECTED, IntegrationStatus.TESTING].includes(integration.status)) {
      throw new ForbiddenException("Integration is not enabled for transaction ingestion.");
    }

    const risk = await this.riskScoring.score({
      amount: dto.amount,
      eventType: dto.eventType,
      signals: dto.signals,
    });
    const transactionId = randomUUID();
    const eventAt = new Date(dto.eventAt);
    const level = RiskLevel[risk.level];
    const decision = Decision[risk.recommendation];
    const response = {
      id: transactionId,
      externalTransactionId: dto.externalTransactionId,
      processingStatus: ProcessingStatus.PROCESSED,
      riskScore: risk.score,
      riskLevel: level,
      decision,
      modelVersion: risk.modelVersion,
      policyVersion: risk.policyVersion,
      degraded: risk.degraded,
    };

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyRecord.create({
            data: {
              tenantId: principal.tenantId,
              operation: "transactions.ingest",
              key: idempotencyKey,
              requestHash,
              lockedUntil: new Date(Date.now() + 60_000),
              expiresAt: new Date(Date.now() + 86_400_000),
            },
          });
          await tx.rawIngestionEvent.create({
            data: {
              tenantId: principal.tenantId,
              integrationId: integration.id,
              externalEventId: dto.externalTransactionId,
              schemaVersion: dto.schemaVersion,
              eventType: dto.eventType,
              eventAt,
              payloadHash: requestHash,
              canonicalHash: this.hash({ ...dto, signals: dto.signals ?? {} }),
              status: ProcessingStatus.PROCESSED,
              processedAt: new Date(),
            },
          });
          await tx.transactionMonitor.create({
            data: {
              id: transactionId,
              tenantId: principal.tenantId,
              sourceIntegrationId: integration.id,
              externalTransactionId: dto.externalTransactionId,
              schemaVersion: dto.schemaVersion,
              rail: dto.rail,
              eventType: dto.eventType,
              amount: new Prisma.Decimal(dto.amount),
              currency: dto.currency,
              originalAmount: dto.originalAmount
                ? new Prisma.Decimal(dto.originalAmount)
                : undefined,
              originalCurrency: dto.originalCurrency,
              status: ProcessingStatus.PROCESSED,
              customerId: dto.customerId,
              accountId: dto.accountId,
              cardId: dto.cardId,
              merchantId: dto.merchantId,
              deviceId: dto.deviceId,
              ipAddress: dto.ipAddress,
              beneficiaryId: dto.beneficiaryId,
              riskScore: risk.score,
              riskLevel: level,
              decision,
              reasons: risk.reasons,
              explainability: this.json(risk.explainability),
              modelVersion: risk.modelVersion,
              policyVersion: risk.policyVersion,
              eventAt,
              processedAt: new Date(),
            },
          });
          await tx.riskAssessment.create({
            data: {
              tenantId: principal.tenantId,
              transactionId,
              modelVersion: risk.modelVersion,
              featureVersion: risk.featureVersion,
              policyVersion: risk.policyVersion,
              score: risk.score,
              level,
              recommendation: decision,
              finalDecision: decision,
              componentScores: risk.componentScores,
              reasons: risk.reasons,
              explainability: this.json(risk.explainability),
            },
          });
          await tx.outboxEvent.create({
            data: {
              tenantId: principal.tenantId,
              topic: "financial-events.v1",
              eventKey: transactionId,
              eventType: "transaction.scored",
              schemaVersion: "1.0",
              payload: this.json(response),
              headers: this.json({
                tenantId: principal.tenantId,
                integrationId: integration.id,
                correlationId: idempotencyKey,
              }),
            },
          });
          await tx.integrationConnection.update({
            where: { id: integration.id },
            data: {
              totalTransactionsIngested: { increment: 1 },
              lastSyncAt: new Date(),
              lastSuccessfulSyncAt: new Date(),
            },
          });
          await this.audit.append(
            {
              tenantId: principal.tenantId,
              actor: principal.subject,
              role: principal.roles[0] ?? "unknown",
              action: "transaction.ingested",
              target: transactionId,
              correlationId: idempotencyKey,
              metadata: {
                integrationId: integration.id,
                externalTransactionId: dto.externalTransactionId,
                riskScore: risk.score,
                decision,
                degraded: risk.degraded,
              },
            },
            tx,
          );
          await tx.idempotencyRecord.update({
            where: {
              tenantId_operation_key: {
                tenantId: principal.tenantId,
                operation: "transactions.ingest",
                key: idempotencyKey,
              },
            },
            data: {
              responseCode: 201,
              responseBody: this.json(response),
              completedAt: new Date(),
              lockedUntil: null,
            },
          });
          return response;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Transaction or idempotency record already exists.");
      }
      throw error;
    }
  }

  async list(tenantId: string, limit: number, cursor?: string) {
    await this.prisma.ensureConnected();
    const rows = await this.prisma.transactionMonitor.findMany({
      where: { tenantId },
      orderBy: [{ ingestedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        externalTransactionId: true,
        rail: true,
        eventType: true,
        amount: true,
        currency: true,
        status: true,
        customerId: true,
        merchantId: true,
        riskScore: true,
        riskLevel: true,
        decision: true,
        reasons: true,
        modelVersion: true,
        policyVersion: true,
        eventAt: true,
        ingestedAt: true,
        processedAt: true,
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((item) => ({ ...item, amount: item.amount.toString() })),
      nextCursor: hasMore ? items.at(-1)?.id : undefined,
    };
  }

  private hash(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
